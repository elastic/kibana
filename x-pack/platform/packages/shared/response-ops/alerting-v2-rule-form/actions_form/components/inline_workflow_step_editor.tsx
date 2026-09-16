/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFieldText, EuiFormRow, EuiIcon, EuiLink, EuiSpacer } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import {
  getInlineActionStepDefinition,
  INLINE_ACTION_STEP_DEFINITIONS,
} from '../registry';
import type { InlineActionStepType, InlineWorkflowStepDraft } from '../types';
import { ConnectorSelector } from './connector_selector';
import { ParamsEditor } from './params_editor';

export interface InlineWorkflowStepEditorProps {
  value: InlineWorkflowStepDraft;
  onChange: (next: InlineWorkflowStepDraft) => void;
}

const ACTION_TYPE_OPTIONS: Array<EuiComboBoxOptionOption<string>> =
  INLINE_ACTION_STEP_DEFINITIONS.map((stepDefinition) => ({
    label: stepDefinition.label,
    value: stepDefinition.id,
    prepend: <EuiIcon type={stepDefinition.iconType ?? 'plugs'} size="s" />,
  }));

export const InlineWorkflowStepEditor = ({ value, onChange }: InlineWorkflowStepEditorProps) => {
  const application = useService(CoreStart('application'));
  const createWorkflowUrl = application.getUrlForApp(WORKFLOWS_APP_ID, { path: '/create' });
  const definition = getInlineActionStepDefinition(value.stepType);

  const selectedActionType = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    if (!value.stepType) {
      return [];
    }
    const selectedDefinition = getInlineActionStepDefinition(value.stepType);
    return [
      {
        label: selectedDefinition?.label ?? value.stepType,
        value: value.stepType,
        prepend: <EuiIcon type={selectedDefinition?.iconType ?? 'plugs'} size="s" />,
      },
    ];
  }, [value.stepType]);

  if (!definition) {
    return null;
  }

  const handleActionTypeChange = (options: Array<EuiComboBoxOptionOption<string>>) => {
    const nextStepType = options[0]?.value as InlineActionStepType | undefined;
    if (!nextStepType || nextStepType === value.stepType) {
      return;
    }
    const nextDefinition = getInlineActionStepDefinition(nextStepType);
    if (!nextDefinition) {
      return;
    }
    onChange({
      ...value,
      stepType: nextDefinition.id,
      connectorId: null,
      params: nextDefinition.paramsTemplate,
    });
  };

  return (
    <div data-test-subj="inlineWorkflowStepEditor">
      <EuiFormRow
        label={i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.actionType.label', {
          defaultMessage: 'Action type',
        })}
        helpText={
          <FormattedMessage
            id="xpack.responseOps.alertingV2RuleForm.actionForm.actionType.helpText"
            defaultMessage="Use this form for Email or Slack. Need a different action type? {createWorkflowLink}."
            values={{
              createWorkflowLink: (
                <EuiLink
                  href={createWorkflowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test-subj="inlineWorkflowCreateWorkflowLink"
                >
                  <FormattedMessage
                    id="xpack.responseOps.alertingV2RuleForm.actionForm.actionType.createWorkflowLink"
                    defaultMessage="Create a workflow"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        fullWidth
      >
        <EuiComboBox
          fullWidth
          compressed
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          options={ACTION_TYPE_OPTIONS}
          selectedOptions={selectedActionType}
          onChange={handleActionTypeChange}
          placeholder={i18n.translate(
            'xpack.responseOps.alertingV2RuleForm.actionForm.actionType.placeholder',
            { defaultMessage: 'Select an action type' }
          )}
          data-test-subj="inlineWorkflowActionTypeSelect"
          aria-label={i18n.translate(
            'xpack.responseOps.alertingV2RuleForm.actionForm.actionType.ariaLabel',
            { defaultMessage: 'Action type' }
          )}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.stepName.label', {
          defaultMessage: 'Step name',
        })}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          compressed
          value={value.stepName}
          onChange={(event) => onChange({ ...value, stepName: event.target.value })}
          data-test-subj="inlineWorkflowStepNameInput"
          placeholder={i18n.translate(
            'xpack.responseOps.alertingV2RuleForm.actionForm.stepName.placeholder',
            { defaultMessage: 'Enter a step name' }
          )}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <ConnectorSelector
        connectorTypeId={definition.connectorTypeId}
        value={value.connectorId}
        onChange={(connectorId) => {
          if (connectorId === value.connectorId) return;
          onChange({ ...value, connectorId });
        }}
      />
      {definition.CustomComponent && (
        <definition.CustomComponent value={value} onChange={(nextValue) => onChange(nextValue)} />
      )}
      <EuiSpacer size="m" />
      <ParamsEditor value={value.params} onChange={(params) => onChange({ ...value, params })} />
    </div>
  );
};
