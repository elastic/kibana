/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React, { Suspense, useCallback, useState, useMemo } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiTitle,
  EuiTabbedContent,
  EuiText,
  EuiBadge,
  EuiLoadingSpinner,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSplitPanel,
  EuiTextArea,
} from '@elastic/eui';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { useForm, FormProvider, Controller, useWatch } from 'react-hook-form';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { HttpStart, NotificationsStart, ApplicationStart } from '@kbn/core/public';
import { toCreatePayload } from '../../components/notification_policy/form/form_utils';
import {
  FREQUENCY_OPTIONS,
  THROTTLE_INTERVAL_PATTERN,
} from '../../components/notification_policy/form/constants';
import {
  INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH,
  MANAGEMENT_APP_ID,
  ALERTING_V2_MANAGEMENT_PATH,
} from '../../constants';
import { mapAttachmentToFormValues } from './map_attachment_to_form_values';
import type { NotificationPolicyFormState } from '../../components/notification_policy/form/types';
import type { NotificationPolicyAttachment } from '../../../common/attachment_types';

interface StandaloneWorkflowEditorProps {
  initialYaml: string;
  onYamlChange?: (yaml: string) => void;
  height?: string;
}

export interface NotificationPolicyCanvasContentProps
  extends AttachmentRenderProps<NotificationPolicyAttachment> {
  http: HttpStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
  closeCanvas: () => void;
  WorkflowEditor: ComponentType<StandaloneWorkflowEditorProps>;
}

export const NotificationPolicyCanvasContent = ({
  attachment,
  http,
  notifications,
  application,
  closeCanvas,
  openSidebarConversation,
  WorkflowEditor,
}: NotificationPolicyCanvasContentProps) => {
  const { data } = attachment;
  const [isLoading, setIsLoading] = useState(false);

  const defaultValues: NotificationPolicyFormState = useMemo(
    () => ({
      name: data.name,
      description: data.description,
      matcher: data.matcher ?? '',
      groupBy: data.groupBy ?? [],
      frequency: data.throttle
        ? { type: 'throttle' as const, interval: data.throttle.interval }
        : { type: 'immediate' as const },
      destinations: [],
    }),
    [data]
  );

  const methods = useForm<NotificationPolicyFormState>({
    mode: 'onBlur',
    defaultValues,
  });

  const frequency = useWatch({ control: methods.control, name: 'frequency' });

  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    try {
      let workflowId: string;

      if (data.workflow.source === 'inline') {
        const workflowResult = await http.post<{ id: string }>('/api/workflows', {
          body: JSON.stringify({ yaml: data.workflow.yaml }),
        });
        workflowId = workflowResult.id;
      } else {
        workflowId = data.workflow.id;
      }

      const formValues = methods.getValues();
      const policyPayload = toCreatePayload({
        ...formValues,
        destinations: [{ type: 'workflow' as const, id: workflowId }],
      });

      await http.post(INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH, {
        body: JSON.stringify(policyPayload),
      });

      notifications.toasts.addSuccess(
        i18n.translate('xpack.alertingVTwo.attachments.notificationPolicy.createSuccess', {
          defaultMessage:
            data.workflow.source === 'inline'
              ? 'Workflow and notification policy created successfully'
              : 'Notification policy created successfully',
        })
      );
      closeCanvas();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.alertingVTwo.attachments.notificationPolicy.createError', {
          defaultMessage: 'Failed to create notification policy',
        }),
      });
    } finally {
      setIsLoading(false);
    }
  }, [data, http, notifications, closeCanvas, methods]);

  const handleEditInPolicies = useCallback(async () => {
    const formValues = mapAttachmentToFormValues(data);
    await application.navigateToApp(MANAGEMENT_APP_ID, {
      path: `${ALERTING_V2_MANAGEMENT_PATH}/notification_policies/create`,
      state: { initialValues: formValues },
    });
    openSidebarConversation?.();
  }, [application, data, openSidebarConversation]);

  const policyTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'policy',
      name: i18n.translate('xpack.alertingVTwo.attachments.notificationPolicy.tab.policy', {
        defaultMessage: 'Notification Policy',
      }),
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="popout"
                iconSide="right"
                onClick={handleEditInPolicies}
              >
                {i18n.translate(
                  'xpack.alertingVTwo.attachments.notificationPolicy.canvas.editInPolicies',
                  { defaultMessage: 'Edit in notification policies' }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <FormProvider {...methods}>
            <EuiSplitPanel.Outer borderRadius="m" hasShadow={true} hasBorder={true}>
              <EuiSplitPanel.Inner color="subdued">
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate(
                      'xpack.alertingVTwo.attachments.notificationPolicy.canvas.basicInfo',
                      { defaultMessage: 'Basic information' }
                    )}
                  </h3>
                </EuiTitle>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner>
                <Controller
                  name="name"
                  control={methods.control}
                  rules={{
                    required: i18n.translate(
                      'xpack.alertingVTwo.attachments.notificationPolicy.canvas.nameRequired',
                      { defaultMessage: 'Name is required.' }
                    ),
                  }}
                  render={({ field: { ref, ...field }, fieldState: { error } }) => (
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.alertingVTwo.attachments.notificationPolicy.canvas.name',
                        { defaultMessage: 'Name' }
                      )}
                      fullWidth
                      isInvalid={!!error}
                      error={error?.message}
                    >
                      <EuiFieldText {...field} inputRef={ref} fullWidth isInvalid={!!error} />
                    </EuiFormRow>
                  )}
                />
                <Controller
                  name="description"
                  control={methods.control}
                  render={({ field: { ref, ...field } }) => (
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.alertingVTwo.attachments.notificationPolicy.canvas.description',
                        { defaultMessage: 'Description' }
                      )}
                      fullWidth
                    >
                      <EuiTextArea {...field} inputRef={ref} fullWidth rows={3} />
                    </EuiFormRow>
                  )}
                />
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>

            <EuiSpacer size="m" />

            <EuiSplitPanel.Outer borderRadius="m" hasShadow={true} hasBorder={true}>
              <EuiSplitPanel.Inner color="subdued">
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate(
                      'xpack.alertingVTwo.attachments.notificationPolicy.canvas.matching',
                      { defaultMessage: 'Match conditions' }
                    )}
                  </h3>
                </EuiTitle>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner>
                <Controller
                  name="matcher"
                  control={methods.control}
                  render={({ field: { ref, ...field } }) => (
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.alertingVTwo.attachments.notificationPolicy.canvas.matcher',
                        { defaultMessage: 'Matcher' }
                      )}
                      fullWidth
                    >
                      <EuiFieldText
                        {...field}
                        inputRef={ref}
                        fullWidth
                        placeholder='e.g. data.severity : "critical" and data.env : "prod"'
                      />
                    </EuiFormRow>
                  )}
                />
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>

            <EuiSpacer size="m" />

            <EuiSplitPanel.Outer borderRadius="m" hasShadow={true} hasBorder={true}>
              <EuiSplitPanel.Inner color="subdued">
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate(
                      'xpack.alertingVTwo.attachments.notificationPolicy.canvas.grouping',
                      { defaultMessage: 'Grouping' }
                    )}
                  </h3>
                </EuiTitle>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner>
                <Controller
                  name="groupBy"
                  control={methods.control}
                  render={({ field }) => (
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.alertingVTwo.attachments.notificationPolicy.canvas.groupByFields',
                        { defaultMessage: 'Fields' }
                      )}
                      fullWidth
                    >
                      <EuiComboBox
                        fullWidth
                        placeholder={i18n.translate(
                          'xpack.alertingVTwo.attachments.notificationPolicy.canvas.groupByPlaceholder',
                          { defaultMessage: 'Add field name (ex: host.name, service)' }
                        )}
                        selectedOptions={field.value.map((g: string) => ({ label: g }))}
                        onCreateOption={(value) => field.onChange([...field.value, value])}
                        onChange={(options) => field.onChange(options.map((o) => o.label))}
                        noSuggestions
                      />
                    </EuiFormRow>
                  )}
                />
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>

            <EuiSpacer size="m" />

            <EuiSplitPanel.Outer borderRadius="m" hasShadow={true} hasBorder={true}>
              <EuiSplitPanel.Inner color="subdued">
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate(
                      'xpack.alertingVTwo.attachments.notificationPolicy.canvas.frequency',
                      { defaultMessage: 'Frequency' }
                    )}
                  </h3>
                </EuiTitle>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner>
                <Controller
                  name="frequency.type"
                  control={methods.control}
                  render={({ field: { ref, ...field } }) => (
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.alertingVTwo.attachments.notificationPolicy.canvas.frequencyType',
                        { defaultMessage: 'Frequency' }
                      )}
                      fullWidth
                    >
                      <EuiSelect {...field} inputRef={ref} fullWidth options={FREQUENCY_OPTIONS} />
                    </EuiFormRow>
                  )}
                />
                {frequency.type === 'throttle' && (
                  <Controller
                    name="frequency.interval"
                    control={methods.control}
                    rules={{
                      pattern: {
                        value: THROTTLE_INTERVAL_PATTERN,
                        message: i18n.translate(
                          'xpack.alertingVTwo.attachments.notificationPolicy.canvas.throttlePattern',
                          { defaultMessage: 'Must be in the format of 1h, 5m, 30s' }
                        ),
                      },
                      required: i18n.translate(
                        'xpack.alertingVTwo.attachments.notificationPolicy.canvas.throttleRequired',
                        { defaultMessage: 'Throttle interval is required.' }
                      ),
                    }}
                    render={({ field: { ref, ...field }, fieldState: { error } }) => (
                      <EuiFormRow
                        label={i18n.translate(
                          'xpack.alertingVTwo.attachments.notificationPolicy.canvas.throttleInterval',
                          { defaultMessage: 'Throttle interval' }
                        )}
                        helpText="e.g. 1h, 5m, 30s"
                        fullWidth
                        isInvalid={!!error}
                        error={error?.message}
                      >
                        <EuiFieldText
                          {...field}
                          inputRef={ref}
                          value={field.value ?? ''}
                          fullWidth
                          isInvalid={!!error}
                        />
                      </EuiFormRow>
                    )}
                  />
                )}
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </FormProvider>
        </>
      ),
    }),
    [methods, frequency, handleEditInPolicies]
  );

  const handleEditInWorkflows = useCallback(async () => {
    if (data.workflow.source === 'existing') {
      await application.navigateToApp(WORKFLOWS_APP_ID, {
        path: data.workflow.id,
      });
    } else {
      await application.navigateToApp(WORKFLOWS_APP_ID, {
        path: '/create',
        state: { initialYaml: data.workflow.yaml },
      });
    }
    openSidebarConversation?.();
  }, [application, data.workflow, openSidebarConversation]);

  const workflowTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'workflow',
      name: i18n.translate('xpack.alertingVTwo.attachments.notificationPolicy.tab.workflow', {
        defaultMessage: 'Workflow',
      }),
      content: (
        <>
          <EuiSpacer size="m" />
          {data.workflow.source === 'inline' ? (
            <>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>{data.workflow.name}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="accent">
                    {i18n.translate(
                      'xpack.alertingVTwo.attachments.notificationPolicy.canvas.newWorkflow',
                      { defaultMessage: 'New' }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
                {data.workflow.isValid != null && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={data.workflow.isValid ? 'success' : 'warning'}>
                      {data.workflow.isValid ? 'Valid' : 'Has errors'}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow />
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="popout"
                    iconSide="right"
                    onClick={handleEditInWorkflows}
                  >
                    {i18n.translate(
                      'xpack.alertingVTwo.attachments.notificationPolicy.canvas.editInWorkflows',
                      { defaultMessage: 'Edit in Workflows' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                <WorkflowEditor initialYaml={data.workflow.yaml} height="400px" />
              </Suspense>
            </>
          ) : (
            <EuiPanel hasShadow={false} hasBorder={true} paddingSize="l">
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow>
                  <EuiTitle size="xs">
                    <h3>{data.workflow.name}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="popout"
                    iconSide="right"
                    onClick={handleEditInWorkflows}
                  >
                    {i18n.translate(
                      'xpack.alertingVTwo.attachments.notificationPolicy.canvas.editInWorkflows',
                      { defaultMessage: 'Edit in Workflows' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.alertingVTwo.attachments.notificationPolicy.canvas.existingWorkflow',
                  {
                    defaultMessage:
                      'This policy uses the existing workflow "{name}". It will be linked when the policy is created.',
                    values: { name: data.workflow.name },
                  }
                )}
              </EuiText>
            </EuiPanel>
          )}
        </>
      ),
    }),
    [data.workflow, WorkflowEditor, handleEditInWorkflows]
  );

  const tabs = useMemo(() => [policyTab, workflowTab], [policyTab, workflowTab]);

  return (
    <EuiPanel hasShadow={false} hasBorder={false}>
      <EuiTitle size="xs">
        <h3>{data.name}</h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiTabbedContent tabs={tabs} initialSelectedTab={policyTab} autoFocus="selected" />

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => closeCanvas()} isLoading={isLoading}>
            {i18n.translate('xpack.alertingVTwo.attachments.notificationPolicy.canvas.cancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={handleCreate} isLoading={isLoading}>
            {i18n.translate('xpack.alertingVTwo.attachments.notificationPolicy.canvas.create', {
              defaultMessage:
                data.workflow.source === 'inline'
                  ? 'Create workflow & policy'
                  : 'Create notification policy',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
