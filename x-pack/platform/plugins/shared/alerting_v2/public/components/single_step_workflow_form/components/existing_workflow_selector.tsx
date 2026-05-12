/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut, EuiComboBox, EuiFormRow, EuiLink } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebouncedValue } from '@kbn/react-hooks';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import React, { useState } from 'react';
import { useFetchWorkflows } from '../../../hooks/use_fetch_workflows';
import { SINGLE_STEP_WORKFLOW_TAG } from '../constants';

const CREATE_NEW_OPTION_VALUE = '__create_new_workflow__';

interface ExistingWorkflowSelectorProps {
  value: string | null;
  onSelect: (workflowId: string) => void;
  onCreateNew: () => void;
  isInvalid?: boolean;
  errorMessage?: string;
}

export const ExistingWorkflowSelector = ({
  value,
  onSelect,
  onCreateNew,
  isInvalid,
  errorMessage,
}: ExistingWorkflowSelectorProps) => {
  const application = useService(CoreStart('application'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const isWorkflowsEnabled = uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const { data: workflowsData, isLoading } = useFetchWorkflows({
    query: debouncedQuery,
    tags: [SINGLE_STEP_WORKFLOW_TAG],
    isEnabled: isWorkflowsEnabled,
  });

  const results = workflowsData?.results ?? [];
  const workflowOptions: Array<EuiComboBoxOptionOption<string>> = [
    ...results.map((w) => ({ label: w.name, value: w.id })),
    {
      label: i18n.translate(
        'xpack.alertingV2.singleStepWorkflow.existing.createNewWorkflowOption',
        { defaultMessage: '+ Create new workflow' }
      ),
      value: CREATE_NEW_OPTION_VALUE,
    },
  ];

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = value
    ? [{ label: results.find((w) => w.id === value)?.name ?? value, value }]
    : [];

  if (!isWorkflowsEnabled) {
    const settingsUrl = application.getUrlForApp('management', {
      path: `/kibana/settings?query=${encodeURIComponent(WORKFLOWS_UI_SETTING_ID)}`,
    });
    return (
      <EuiCallOut
        announceOnMount={false}
        title={i18n.translate('xpack.alertingV2.singleStepWorkflow.workflowsDisabled.title', {
          defaultMessage: 'Workflows are not enabled',
        })}
        color="warning"
        iconType="warning"
        data-test-subj="singleStepWorkflowsDisabledCallout"
      >
        <FormattedMessage
          id="xpack.alertingV2.singleStepWorkflow.workflowsDisabled.description"
          defaultMessage="Single-step workflows require the Workflows feature. Enable the {settingName} setting in {advancedSettingsLink}, then refresh this page."
          values={{
            settingName: WORKFLOWS_UI_SETTING_ID,
            advancedSettingsLink: (
              <EuiLink href={settingsUrl} data-test-subj="singleStepWorkflowsDisabledSettingsLink">
                <FormattedMessage
                  id="xpack.alertingV2.singleStepWorkflow.workflowsDisabled.advancedSettingsLink"
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
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.singleStepWorkflow.existing.label', {
        defaultMessage: 'Workflow',
      })}
      fullWidth
      isInvalid={!!isInvalid}
      error={errorMessage}
    >
      <EuiComboBox
        fullWidth
        async
        singleSelection={{ asPlainText: true }}
        isLoading={isLoading}
        isInvalid={!!isInvalid}
        data-test-subj="singleStepWorkflowSelector"
        placeholder={i18n.translate('xpack.alertingV2.singleStepWorkflow.existing.placeholder', {
          defaultMessage: 'Search or create a workflow',
        })}
        selectedOptions={selectedOptions}
        onSearchChange={setSearchQuery}
        onChange={(options) => {
          const next = options[0];
          if (!next) return;
          if (next.value === CREATE_NEW_OPTION_VALUE) {
            onCreateNew();
            return;
          }
          if (next.value) {
            onSelect(next.value);
          }
        }}
        options={workflowOptions}
      />
    </EuiFormRow>
  );
};
