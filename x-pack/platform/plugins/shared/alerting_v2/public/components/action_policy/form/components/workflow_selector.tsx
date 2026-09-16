/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useFetchWorkflows } from '../../../../hooks/use_fetch_workflows';
import type { ActionPolicyFormState } from '../types';
import { buildInlineActionDraft } from './build_inline_action_draft';
import { SelectedWorkflowCard } from './selected_workflow_card';
import { SimpleWorkflowBuilder } from './simple_workflow_builder';

interface SelectedWorkflow {
  id: string;
  name: string;
  description?: string;
}

const CREATE_WORKFLOW_OPTION_VALUE = '__create_workflow__';

const ACTION_STEPS_DOCS_URL =
  'https://www.elastic.co/docs/explore-analyze/workflows/steps/action-steps#external-systems-and-apps';

const CREATE_WORKFLOW_OPTION: EuiComboBoxOptionOption<string> = {
  label: i18n.translate('xpack.alertingV2.actionPolicy.form.destination.createWorkflowOption', {
    defaultMessage: 'Create a workflow',
  }),
  value: CREATE_WORKFLOW_OPTION_VALUE,
  prepend: <EuiIcon type="plusCircle" color="text" />,
};

const DestinationsHelpText = () => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.alertingV2.actionPolicy.form.destination.actionStepsAvailable', {
          defaultMessage: 'Workflows action steps:',
        })}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type="logoSlack" size="m" aria-label="Slack" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type="logoWebhook" size="m" aria-label="Webhook" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type="logoGmail" size="m" aria-label="Email" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        size="xs"
        flush="left"
        iconType="external"
        iconSide="right"
        href={ACTION_STEPS_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-test-subj="destinationsActionStepsDocsLink"
      >
        {i18n.translate('xpack.alertingV2.actionPolicy.form.destination.seeAllActionSteps', {
          defaultMessage: 'See all available action steps',
        })}
      </EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface WorkflowSelectorProps {
  /**
   * When false, opens workflow details and Advanced Settings in a new browser tab
   * instead of nesting flyouts (used by the essential create-from-rule form).
   * Create simple workflow remains available in both modes.
   */
  allowNestedFlyouts?: boolean;
  /**
   * When false, hides "+ Create new connector" in the simple workflow builder
   * (essential create-from-rule form).
   */
  allowCreateConnector?: boolean;
}

export const WorkflowSelector = ({
  allowNestedFlyouts = true,
  allowCreateConnector = true,
}: WorkflowSelectorProps) => {
  const { control, getValues, setValue } = useFormContext<ActionPolicyFormState>();
  const destinations = useWatch({ control, name: 'destinations' });
  const inlineActions = useWatch({ control, name: 'inlineActions' });
  const application = useService(CoreStart('application'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const { euiTheme } = useEuiTheme();
  const isWorkflowsEnabled = uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID);

  const [selectedWorkflows, setSelectedWorkflows] = useState<SelectedWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [comboKey, setComboKey] = useState(0);
  const comboInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const { data: workflowsData, isLoading } = useFetchWorkflows({
    query: debouncedQuery,
    isEnabled: isWorkflowsEnabled,
  });

  useEffect(() => {
    if (selectedWorkflows.length > 0 || destinations.length === 0 || !workflowsData) {
      return;
    }

    const workflowsByIdMap = new Map(workflowsData.results.map((w) => [w.id, w]));
    setSelectedWorkflows(
      destinations.map((d) => {
        const workflow = workflowsByIdMap.get(d.id);
        return {
          id: d.id,
          name: workflow?.name ?? d.id,
          description: workflow?.description,
        };
      })
    );
  }, [destinations, workflowsData, selectedWorkflows.length]);

  const createWorkflowUrl = application.getUrlForApp(WORKFLOWS_APP_ID, { path: '/create' });

  const workflowsById = useMemo(
    () => new Map((workflowsData?.results ?? []).map((workflow) => [workflow.id, workflow])),
    [workflowsData?.results]
  );

  const options = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    const workflowOptions = (workflowsData?.results ?? []).map((w) => ({
      label: w.name,
      value: w.id,
    }));

    return [
      ...workflowOptions,
      {
        ...CREATE_WORKFLOW_OPTION,
        // Full-width divider above the create action (applied to the option row).
        css: css`
          margin-block-start: 2px;
          border-top: ${euiTheme.border.thin};
          padding-block-start: 2px;
        `,
      },
    ];
  }, [euiTheme.border.thin, workflowsData?.results]);

  const createOnThisPage = useCallback(() => {
    const currentInlineActions = getValues('inlineActions') ?? [];
    setValue('inlineActions', [...currentInlineActions, buildInlineActionDraft('email')], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [getValues, setValue]);

  const openCreateWorkflowTab = useCallback(() => {
    window.open(createWorkflowUrl, '_blank', 'noopener,noreferrer');
    comboInputRef.current?.blur();
    setComboKey((key) => key + 1);
  }, [createWorkflowUrl]);

  const hasDestinationCards =
    selectedWorkflows.length > 0 || (inlineActions?.length ?? 0) > 0;

  if (!isWorkflowsEnabled) {
    const settingsUrl = application.getUrlForApp('management', {
      path: `/kibana/settings?query=${encodeURIComponent(WORKFLOWS_UI_SETTING_ID)}`,
    });

    return (
      <EuiCallOut
        announceOnMount={false}
        title={i18n.translate(
          'xpack.alertingV2.actionPolicy.form.destination.workflowsDisabled.title',
          { defaultMessage: 'Workflows are not enabled' }
        )}
        color="warning"
        iconType="warning"
        data-test-subj="workflowsDisabledCallout"
      >
        <FormattedMessage
          id="xpack.alertingV2.actionPolicy.form.destination.workflowsDisabled.description"
          defaultMessage="Action policies use Workflows for destinations, you'll need to enable them first. Enable the {settingName} setting in {advancedSettingsLink}, then refresh this page."
          values={{
            settingName: WORKFLOWS_UI_SETTING_ID,
            advancedSettingsLink: (
              <EuiLink
                href={settingsUrl}
                target={!allowNestedFlyouts ? '_blank' : undefined}
                rel={!allowNestedFlyouts ? 'noopener noreferrer' : undefined}
                data-test-subj="workflowsDisabledSettingsLink"
              >
                <FormattedMessage
                  id="xpack.alertingV2.actionPolicy.form.destination.workflowsDisabled.advancedSettingsLink"
                  defaultMessage="Advanced Settings"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
    );
  }

  return (
    <Controller
      name="destinations"
      control={control}
      rules={{}}
      render={({ field, fieldState: { error } }) => (
        <>
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.actionPolicy.form.destination.label', {
              defaultMessage: 'Workflows',
            })}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
            helpText={<DestinationsHelpText />}
          >
            <EuiComboBox
              key={comboKey}
              fullWidth
              async
              isLoading={isLoading}
              isInvalid={!!error}
              rowHeight={33}
              data-test-subj="destinationsInput"
              placeholder={i18n.translate(
                'xpack.alertingV2.actionPolicy.form.destination.placeholder',
                { defaultMessage: 'Search existing workflows' }
              )}
              selectedOptions={selectedWorkflows.map((w) => ({ label: w.name, value: w.id }))}
              onSearchChange={setSearchQuery}
              inputRef={(input) => {
                comboInputRef.current = input;
              }}
              onChange={(selectedOptions) => {
                if (
                  selectedOptions.some((option) => option.value === CREATE_WORKFLOW_OPTION_VALUE)
                ) {
                  openCreateWorkflowTab();
                  return;
                }

                const workflowSelections = selectedOptions.filter(
                  (option) =>
                    Boolean(option.value) && option.value !== CREATE_WORKFLOW_OPTION_VALUE
                );

                setSelectedWorkflows(
                  workflowSelections.map((option) => {
                    const details = workflowsById.get(option.value as string);
                    return {
                      id: option.value as string,
                      name: option.label,
                      description: details?.description,
                    };
                  })
                );
                field.onChange(
                  workflowSelections.map((option) => ({
                    type: 'workflow' as const,
                    id: option.value as string,
                  }))
                );
              }}
              options={options}
            />
          </EuiFormRow>

          {hasDestinationCards && (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="destinationCards">
                {selectedWorkflows.map((workflow) => {
                  const details = workflowsById.get(workflow.id);
                  return (
                    <EuiFlexItem key={workflow.id}>
                      <SelectedWorkflowCard
                        id={workflow.id}
                        name={workflow.name}
                        description={workflow.description ?? details?.description}
                        definition={details?.definition}
                        allowDetailsFlyout={allowNestedFlyouts}
                      />
                    </EuiFlexItem>
                  );
                })}
                <SimpleWorkflowBuilder allowCreateConnector={allowCreateConnector} />
              </EuiFlexGroup>
            </>
          )}

          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="text"
                size="s"
                onClick={createOnThisPage}
                data-test-subj="createDestinationButton"
              >
                {i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.destination.createDestination',
                  { defaultMessage: 'Create simple workflow' }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    />
  );
};
