/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiComboBox, EuiFormRow, EuiLink } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useFetchWorkflows } from '../../../../hooks/use_fetch_workflows';
import type { ActionPolicyFormState } from '../types';

interface SelectedWorkflow {
  id: string;
  name: string;
}

export const WorkflowSelector = () => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const destinations = useWatch({ control, name: 'destinations' });
  const application = useService(CoreStart('application'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const isWorkflowsEnabled = uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID);

  const [selectedWorkflows, setSelectedWorkflows] = useState<SelectedWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const { data: workflowsData, isLoading } = useFetchWorkflows({
    query: debouncedQuery,
    isEnabled: isWorkflowsEnabled,
  });

  useEffect(() => {
    if (selectedWorkflows.length > 0 || destinations.length === 0 || !workflowsData) {
      return;
    }

    const workflowsById = new Map(workflowsData.results.map((w) => [w.id, w.name]));
    setSelectedWorkflows(
      destinations.map((d) => ({ id: d.id, name: workflowsById.get(d.id) ?? d.id }))
    );
  }, [destinations, workflowsData, selectedWorkflows.length]);

  const workflowOptions = (workflowsData?.results ?? []).map((w) => ({
    label: w.name,
    value: w.id,
  }));

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
      </EuiCallOut>
    );
  }

  const createWorkflowUrl = application.getUrlForApp(WORKFLOWS_APP_ID, { path: '/create' });

  return (
    <Controller
      name="destinations"
      control={control}
      rules={{
        validate: (value) =>
          value.length > 0
            ? true
            : i18n.translate('xpack.alertingV2.actionPolicy.form.destination.required', {
                defaultMessage: 'At least one destination is required',
              }),
      }}
      render={({ field, fieldState: { error } }) => (
        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.actionPolicy.form.destination.workflows', {
            defaultMessage: 'Workflows',
          })}
          fullWidth
          isInvalid={!!error}
          error={error?.message}
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
          <EuiComboBox
            fullWidth
            async
            isLoading={isLoading}
            isInvalid={!!error}
            data-test-subj="destinationsInput"
            placeholder={i18n.translate(
              'xpack.alertingV2.actionPolicy.form.destination.placeholder',
              { defaultMessage: 'Search and select workflows' }
            )}
            selectedOptions={selectedWorkflows.map((w) => ({ label: w.name, value: w.id }))}
            onSearchChange={setSearchQuery}
            onChange={(options) => {
              setSelectedWorkflows(options.map((o) => ({ id: o.value as string, name: o.label })));
              field.onChange(
                options.map((o) => ({ type: 'workflow' as const, id: o.value as string }))
              );
            }}
            options={workflowOptions}
          />
        </EuiFormRow>
      )}
    />
  );
};
