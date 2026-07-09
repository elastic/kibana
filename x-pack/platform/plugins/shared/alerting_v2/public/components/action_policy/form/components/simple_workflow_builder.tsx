/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import {
  INLINE_ACTION_STEP_DEFINITIONS,
  InlineWorkflowEditor,
  getInlineActionStepDefinition,
  type InlineActionStepType,
  type InlineWorkflowActionDraft,
} from '@kbn/alerting-v2-rule-form';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import type { ActionPolicyFormState } from '../types';

const buildDraft = (stepType: InlineActionStepType): InlineWorkflowActionDraft => {
  const definition = getInlineActionStepDefinition(stepType);
  if (!definition) {
    throw new Error(`Unknown inline action step type: ${stepType}`);
  }
  return {
    id: uuidv4(),
    source: 'inline',
    stepType: definition.id,
    connectorId: null,
    params: definition.paramsTemplate,
  };
};

export const SimpleWorkflowBuilder = () => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const uiSettings = useService(CoreStart('uiSettings'));
  const isWorkflowsEnabled = uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID);

  // The Destination section already surfaces the "Workflows are not enabled"
  // callout via WorkflowSelector, so we simply hide the builder when disabled
  // to avoid a duplicate callout.
  if (!isWorkflowsEnabled) {
    return null;
  }

  return (
    <Controller
      name="inlineActions"
      control={control}
      render={({ field }) => {
        const drafts = field.value;

        const addDraft = (stepType: InlineActionStepType) => {
          field.onChange([...drafts, buildDraft(stepType)]);
        };

        const updateDraft = (updated: InlineWorkflowActionDraft) => {
          field.onChange(drafts.map((draft) => (draft.id === updated.id ? updated : draft)));
        };

        const removeDraft = (id: string) => {
          field.onChange(drafts.filter((draft) => draft.id !== id));
        };

        return (
          <div data-test-subj="simpleWorkflowBuilder">
            {drafts.length > 0 && (
              <>
                <EuiFlexGroup direction="column" gutterSize="s">
                  {drafts.map((draft) => {
                    const definition = getInlineActionStepDefinition(draft.stepType);
                    const removeLabel = i18n.translate(
                      'xpack.alertingV2.actionPolicy.form.simpleWorkflow.remove',
                      { defaultMessage: 'Remove simple workflow' }
                    );
                    return (
                      <EuiFlexItem key={draft.id}>
                        <EuiPanel
                          hasBorder
                          hasShadow={false}
                          paddingSize="s"
                          data-test-subj={`simpleWorkflowRow-${draft.id}`}
                        >
                          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiIcon
                                type={definition?.iconType ?? 'gear'}
                                size="m"
                                aria-hidden={true}
                              />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiText size="s">
                                <strong>{definition?.label ?? draft.stepType}</strong>
                              </EuiText>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiToolTip content={removeLabel} disableScreenReaderOutput>
                                <EuiButtonIcon
                                  iconType="cross"
                                  color="danger"
                                  aria-label={removeLabel}
                                  onClick={() => removeDraft(draft.id)}
                                  data-test-subj={`simpleWorkflowRemove-${draft.id}`}
                                />
                              </EuiToolTip>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer size="m" />
                          <InlineWorkflowEditor value={draft} onChange={updateDraft} />
                        </EuiPanel>
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGroup>
                <EuiSpacer size="m" />
              </>
            )}

            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              {INLINE_ACTION_STEP_DEFINITIONS.map((definition) => (
                <EuiFlexItem grow={false} key={definition.id}>
                  <EuiButtonEmpty
                    iconType={definition.iconType ?? 'plusInCircle'}
                    size="s"
                    onClick={() => addDraft(definition.id)}
                    data-test-subj={`simpleWorkflowAdd-${definition.id}`}
                  >
                    {i18n.translate('xpack.alertingV2.actionPolicy.form.simpleWorkflow.add', {
                      defaultMessage: 'Create {label} workflow',
                      values: { label: definition.label },
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        );
      }}
    />
  );
};
