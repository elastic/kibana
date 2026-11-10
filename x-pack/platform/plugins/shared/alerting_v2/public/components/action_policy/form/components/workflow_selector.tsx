/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiComboBox,
  EuiFormErrorText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import { WorkflowSelectorEmptyState } from '@kbn/workflows-ui';
import React, { useEffect, useState } from 'react';
import type { UseControllerProps } from 'react-hook-form';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useFetchWorkflows } from '../../../../hooks/use_fetch_workflows';
import { useFetchWorkflowsByIds } from '../../../../hooks/use_fetch_workflows_by_ids';
import { DestinationCardList } from '../../destination_card/destination_card_list';
import type { ActionPolicyFormState } from '../types';
import type { WorkflowOptionValue } from './workflow_option';
import {
  renderWorkflowOption,
  toWorkflowComboOption,
  WORKFLOW_OPTION_ROW_HEIGHT,
} from './workflow_option';

interface SelectedWorkflow {
  id: string;
  name: string;
}

const DESTINATIONS_RULES: UseControllerProps<ActionPolicyFormState, 'destinations'>['rules'] = {
  validate: (value, { inlineActions }) =>
    value.length > 0 || inlineActions.length > 0
      ? true
      : i18n.translate('xpack.alertingV2.actionPolicy.form.destination.required', {
          defaultMessage: 'At least one destination is required',
        }),
};

export const WorkflowSelector = () => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const destinations = useWatch({ control, name: 'destinations' });
  const application = useService(CoreStart('application'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const isWorkflowsEnabled = uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID);

  const [selectedWorkflows, setSelectedWorkflows] = useState<SelectedWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const {
    data: workflowsData,
    isLoading,
    isError,
    refetch,
  } = useFetchWorkflows({
    query: debouncedQuery,
    isEnabled: isWorkflowsEnabled,
  });

  const selectedWorkflowDetails = useFetchWorkflowsByIds(
    destinations.map(({ id }) => id),
    isWorkflowsEnabled
  );
  const disabledWorkflowNames = selectedWorkflowDetails
    .filter(({ enabled }) => !enabled)
    .map(({ name }) => name);

  useEffect(() => {
    if (selectedWorkflows.length > 0 || destinations.length === 0 || !workflowsData) {
      return;
    }

    const workflowsById = new Map(workflowsData.results.map((w) => [w.id, w.name]));
    setSelectedWorkflows(
      destinations.map((d) => ({ id: d.id, name: workflowsById.get(d.id) ?? d.id }))
    );
  }, [destinations, workflowsData, selectedWorkflows.length]);

  const workflowOptions = (workflowsData?.results ?? []).map(toWorkflowComboOption);
  const hasNoWorkflows =
    !isLoading &&
    !isError &&
    debouncedQuery === '' &&
    searchQuery === '' &&
    workflowsData?.total === 0;

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
              <EuiLink href={settingsUrl} data-test-subj="workflowsDisabledSettingsLink">
                <FormattedMessage
                  id="xpack.alertingV2.actionPolicy.form.destination.workflowsDisabled.advancedSettingsLink"
                  defaultMessage="Advanced Settings"
                />
              </EuiLink>
            ),
          }}
        />
        {/* Keeps the destinations rule active so a policy without destinations can't be submitted. */}
        <Controller
          name="destinations"
          control={control}
          rules={DESTINATIONS_RULES}
          render={({ fieldState: { error } }) => (
            <>{error && <EuiFormErrorText>{error.message}</EuiFormErrorText>}</>
          )}
        />
      </EuiCallOut>
    );
  }

  const createWorkflowUrl = application.getUrlForApp(WORKFLOWS_APP_ID, { path: '/create' });

  return (
    <>
      <Controller
        name="destinations"
        control={control}
        rules={DESTINATIONS_RULES}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.actionPolicy.form.destination.workflows', {
              defaultMessage: 'Workflows',
            })}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
            helpText={
              disabledWorkflowNames.length > 0 ? (
                <EuiText size="xs" color="warning" data-test-subj="disabledDestinationsWarning">
                  {i18n.translate(
                    'xpack.alertingV2.actionPolicy.form.destination.disabledWorkflows',
                    {
                      defaultMessage:
                        '{count, plural, one {Workflow {names} is disabled and will be skipped when dispatching.} other {Workflows {names} are disabled and will be skipped when dispatching.}}',
                      values: {
                        count: disabledWorkflowNames.length,
                        names: disabledWorkflowNames.join(', '),
                      },
                    }
                  )}
                </EuiText>
              ) : undefined
            }
            labelAppend={
              <EuiLink
                href={createWorkflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-test-subj="createWorkflowLink"
              >
                {i18n.translate('xpack.alertingV2.actionPolicy.form.destination.createWorkflow', {
                  defaultMessage: 'Create a workflow',
                })}
              </EuiLink>
            }
          >
            {hasNoWorkflows && destinations.length === 0 ? (
              <div data-test-subj="workflowsEmptyState">
                <WorkflowSelectorEmptyState createWorkflowHref={createWorkflowUrl} />
              </div>
            ) : (
              <EuiComboBox<WorkflowOptionValue>
                fullWidth
                async
                isLoading={isLoading}
                isInvalid={!!error}
                data-test-subj="destinationsInput"
                placeholder={i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.destination.placeholder',
                  { defaultMessage: 'Search and select workflows' }
                )}
                selectedOptions={selectedWorkflows.map(({ id, name }) => ({
                  key: id,
                  label: name,
                  value: { id },
                }))}
                onFocus={() => refetch()}
                onSearchChange={setSearchQuery}
                onChange={(options) => {
                  const nextWorkflows = options.flatMap(({ value, label }) =>
                    value ? [{ id: value.id, name: label }] : []
                  );
                  setSelectedWorkflows(nextWorkflows);
                  field.onChange(
                    nextWorkflows.map(({ id }) => ({ type: 'workflow' as const, id }))
                  );
                }}
                options={workflowOptions}
                renderOption={renderWorkflowOption}
                rowHeight={WORKFLOW_OPTION_ROW_HEIGHT}
              />
            )}
          </EuiFormRow>
        )}
      />
      {destinations.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <DestinationCardList
            destinations={destinations}
            data-test-subj="actionPolicyFormDestinationCards"
          />
        </>
      )}
    </>
  );
};
