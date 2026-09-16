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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import { getDefaultInlineActionStepDefinition, getInlineActionStepDefinition } from '../registry';
import { buildInlineWorkflowStepDraft } from '../helpers/build_inline_workflow_step_draft';
import { isInlineStepValid } from '../types';
import type { InlineWorkflowActionDraft, InlineWorkflowStepDraft } from '../types';
import { InlineWorkflowStepEditor } from './inline_workflow_step_editor';

export interface InlineWorkflowEditorProps {
  value: InlineWorkflowActionDraft;
  onChange: (next: InlineWorkflowActionDraft) => void;
  /** Called when a step editor is opened or closed. */
  onEditingStepChange?: (isEditing: boolean) => void;
}

export const InlineWorkflowEditor = ({
  value,
  onChange,
  onEditingStepChange,
}: InlineWorkflowEditorProps) => {
  const { euiTheme } = useEuiTheme();
  const [expandedStepId, setExpandedStepId] = useState<string | null>(
    () => value.steps[0]?.id ?? null
  );
  const onEditingStepChangeRef = useRef(onEditingStepChange);
  onEditingStepChangeRef.current = onEditingStepChange;

  useEffect(() => {
    onEditingStepChangeRef.current?.(expandedStepId !== null);
  }, [expandedStepId]);

  const allStepsValid = value.steps.every(isInlineStepValid);
  // Show Add step only after the current step is saved (collapsed). While editing,
  // keep focus on the open step form.
  const showAddStep = expandedStepId === null;

  const updateStep = (updated: InlineWorkflowStepDraft) => {
    onChange({
      ...value,
      steps: value.steps.map((step) => (step.id === updated.id ? updated : step)),
    });
  };

  const removeStep = (stepId: string) => {
    const nextSteps = value.steps.filter((step) => step.id !== stepId);
    onChange({ ...value, steps: nextSteps });
    setExpandedStepId((current) => {
      if (current !== stepId) {
        return current;
      }
      return nextSteps[0]?.id ?? null;
    });
  };

  const addStep = () => {
    const defaultDefinition = getDefaultInlineActionStepDefinition();
    const nextStep = buildInlineWorkflowStepDraft(defaultDefinition.id);
    onChange({ ...value, steps: [...value.steps, nextStep] });
    setExpandedStepId(nextStep.id);
  };

  const incompleteStepTooltip = i18n.translate(
    'xpack.responseOps.alertingV2RuleForm.actionForm.steps.incomplete',
    {
      defaultMessage:
        'Fill step name, connector, and all parameters before saving or adding another step',
    }
  );

  return (
    <div data-test-subj="inlineWorkflowEditor">
      <EuiFlexGroup direction="column" gutterSize="s">
        {value.steps.map((step) => {
          const definition = getInlineActionStepDefinition(step.stepType);
          const isExpanded = expandedStepId === step.id;
          const isStepValid = isInlineStepValid(step);
          const label = definition?.label ?? step.stepType;
          const editLabel = i18n.translate(
            'xpack.responseOps.alertingV2RuleForm.actionForm.steps.edit',
            { defaultMessage: 'Edit step' }
          );
          const doneLabel = isStepValid
            ? i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.steps.done', {
                defaultMessage: 'Done editing step',
              })
            : incompleteStepTooltip;
          const cancelLabel = i18n.translate(
            'xpack.responseOps.alertingV2RuleForm.actionForm.steps.collapse',
            { defaultMessage: 'Collapse step' }
          );
          const removeLabel = i18n.translate(
            'xpack.responseOps.alertingV2RuleForm.actionForm.steps.remove',
            { defaultMessage: 'Remove step' }
          );

          return (
            <EuiFlexItem key={step.id}>
              <EuiPanel
                hasBorder
                hasShadow={false}
                paddingSize="s"
                data-test-subj={`inlineWorkflowStepRow-${step.id}`}
                css={
                  isExpanded
                    ? css`
                        border: 1px solid ${euiTheme.colors.borderStrongPrimary};
                        box-sizing: border-box;
                      `
                    : undefined
                }
              >
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={definition?.iconType ?? 'gear'} size="m" aria-hidden />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{isExpanded ? `${label} step` : label}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {isExpanded ? (
                    <>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={doneLabel} disableScreenReaderOutput>
                          {/* Span keeps the tooltip working when the Done control is disabled. */}
                          <span>
                            <EuiButtonIcon
                              size="xs"
                              display="fill"
                              iconType="check"
                              color="success"
                              aria-label={doneLabel}
                              isDisabled={!isStepValid}
                              onClick={() => setExpandedStepId(null)}
                              data-test-subj={`inlineWorkflowStepDone-${step.id}`}
                            />
                          </span>
                        </EuiToolTip>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={cancelLabel} disableScreenReaderOutput>
                          <EuiButtonIcon
                            size="xs"
                            display="base"
                            iconType="cross"
                            aria-label={cancelLabel}
                            onClick={() => setExpandedStepId(null)}
                            data-test-subj={`inlineWorkflowStepCollapse-${step.id}`}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    </>
                  ) : (
                    <>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={editLabel} disableScreenReaderOutput>
                          <EuiButtonIcon
                            size="xs"
                            iconType="pencil"
                            aria-label={editLabel}
                            onClick={() => setExpandedStepId(step.id)}
                            data-test-subj={`inlineWorkflowStepEdit-${step.id}`}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={removeLabel} disableScreenReaderOutput>
                          <EuiButtonIcon
                            size="xs"
                            iconType="trash"
                            color="danger"
                            aria-label={removeLabel}
                            onClick={() => removeStep(step.id)}
                            isDisabled={value.steps.length <= 1}
                            data-test-subj={`inlineWorkflowStepRemove-${step.id}`}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    </>
                  )}
                </EuiFlexGroup>

                {isExpanded && (
                  <>
                    <EuiSpacer size="m" />
                    <InlineWorkflowStepEditor value={step} onChange={updateStep} />
                  </>
                )}
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>

      {showAddStep && (
        <>
          <EuiSpacer size="s" />
          <EuiToolTip
            content={allStepsValid ? undefined : incompleteStepTooltip}
            disableScreenReaderOutput
          >
            {/* Span keeps the tooltip working when Add step is disabled. */}
            <span>
              <EuiButtonEmpty
                size="s"
                color="text"
                iconType="plusCircle"
                onClick={addStep}
                isDisabled={!allStepsValid}
                data-test-subj="inlineWorkflowAddStep"
              >
                {i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.steps.add', {
                  defaultMessage: 'Add step',
                })}
              </EuiButtonEmpty>
            </span>
          </EuiToolTip>
        </>
      )}
    </div>
  );
};
