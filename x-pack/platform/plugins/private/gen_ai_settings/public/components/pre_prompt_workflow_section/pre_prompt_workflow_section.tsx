/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiSplitPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import {
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
  AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS,
} from '@kbn/management-settings-ids';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';
import { PrePromptWorkflowPicker } from './pre_prompt_workflow_picker';

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export const PrePromptWorkflowSection: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { application, settings, agentBuilder },
  } = useKibana();
  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;
  const isWorkflowUiEnabled = settings.client.get(WORKFLOWS_UI_SETTING_ID, false);
  const isAgentBuilderExperimentalFeaturesEnabled = settings.client.get(
    AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
    false
  );
  const shouldRender =
    agentBuilder && isWorkflowUiEnabled && isAgentBuilderExperimentalFeaturesEnabled;

  const field = fields[AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS];
  const isPickerEnabled = field && shouldRender;

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['genAiSettings', 'prePromptWorkflows'],
    enabled: isPickerEnabled,
    queryFn: async () => {
      if (!agentBuilder) {
        return [];
      }
      const response = await agentBuilder.tools.listWorkflows({ page: 1, limit: 1000 });
      return response.results.map((workflow) => ({ id: workflow.id, name: workflow.name }));
    },
  });

  if (!field || !shouldRender || !agentBuilder) {
    return null;
  }

  const savedValue = toStringArray(field.savedValue);
  const unsavedChange = unsavedChanges[AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS];
  const currentValue =
    unsavedChange?.unsavedValue !== undefined && unsavedChange.unsavedValue !== null
      ? toStringArray(unsavedChange.unsavedValue)
      : savedValue;

  const handleChange = (workflowIds: string[]) => {
    handleFieldChange(AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS, {
      type: 'array',
      unsavedValue: workflowIds,
    });
  };

  return (
    <>
      <EuiSpacer size="l" />
      <EuiSplitPanel.Outer hasBorder grow={false}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="s">
            <h3 data-test-subj="agentBuilderSectionTitle">
              <FormattedMessage
                id="genAiSettings.agentBuilder.title"
                defaultMessage="Agent Builder"
              />
            </h3>
          </EuiTitle>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <PrePromptWorkflowPicker
            workflows={workflows}
            value={currentValue}
            onChange={handleChange}
            isLoading={isLoading}
            isDisabled={!canEditAdvancedSettings}
            description={i18n.translate('xpack.genAiSettings.preExecutionWorkflow.description', {
              defaultMessage:
                'Runs as soon as an agent is invoked, before the LLM call. This setting applies to all agents.',
            })}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
