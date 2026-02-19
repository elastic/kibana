/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PrePromptWorkflowPicker } from '@kbn/agent-builder-plugin/public';
import { GEN_AI_SETTINGS_PRE_PROMPT_WORKFLOW_IDS } from '@kbn/management-settings-ids';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export const PrePromptWorkflowSection: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { application },
  } = useKibana();
  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;

  const field = fields[GEN_AI_SETTINGS_PRE_PROMPT_WORKFLOW_IDS];
  if (!field) {
    return null;
  }

  const savedValue = toStringArray(field.savedValue);
  const unsavedChange = unsavedChanges[GEN_AI_SETTINGS_PRE_PROMPT_WORKFLOW_IDS];
  const currentValue =
    unsavedChange?.unsavedValue !== undefined && unsavedChange.unsavedValue !== null
      ? toStringArray(unsavedChange.unsavedValue)
      : savedValue;

  const handleChange = (workflowIds: string[]) => {
    handleFieldChange(GEN_AI_SETTINGS_PRE_PROMPT_WORKFLOW_IDS, {
      type: 'array',
      unsavedValue: workflowIds,
    });
  };

  return (
    <>
      <EuiSpacer size="l" />
      <PrePromptWorkflowPicker
        value={currentValue}
        onChange={handleChange}
        isDisabled={!canEditAdvancedSettings}
        description={i18n.translate('xpack.genAiSettings.preExecutionWorkflow.description', {
          defaultMessage:
            'Runs as soon as an agent is invoked, before the LLM call. This setting applies to all agents.',
        })}
        data-test-subj="genAiSettingsPrePromptWorkflowPicker"
      />
    </>
  );
};
