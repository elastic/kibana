/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFieldText,
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
  InlineWorkflowEditor,
  getInlineActionStepDefinition,
  type InlineWorkflowActionDraft,
} from '@kbn/alerting-v2-rule-form';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { ActionPolicyFormState } from '../types';

export const SimpleWorkflowBuilder = ({
  allowCreateConnector = true,
}: {
  allowCreateConnector?: boolean;
}) => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const uiSettings = useService(CoreStart('uiSettings'));
  const isWorkflowsEnabled = uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID);
  const [collapsedDraftIds, setCollapsedDraftIds] = useState<Set<string>>(new Set());
  // Missing ids default to "editing" so Save stays disabled until the step editor reports otherwise.
  const [editingStepByDraftId, setEditingStepByDraftId] = useState<Map<string, boolean>>(
    () => new Map()
  );

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

        const updateDraft = (updated: InlineWorkflowActionDraft) => {
          field.onChange(drafts.map((draft) => (draft.id === updated.id ? updated : draft)));
        };

        const removeDraft = (id: string) => {
          field.onChange(drafts.filter((draft) => draft.id !== id));
          setCollapsedDraftIds((current) => {
            if (!current.has(id)) {
              return current;
            }
            const next = new Set(current);
            next.delete(id);
            return next;
          });
          setEditingStepByDraftId((current) => {
            if (!current.has(id)) {
              return current;
            }
            const next = new Map(current);
            next.delete(id);
            return next;
          });
        };

        const collapseDraft = (id: string) => {
          setCollapsedDraftIds((current) => new Set(current).add(id));
        };

        const expandDraft = (id: string) => {
          setCollapsedDraftIds((current) => {
            if (!current.has(id)) {
              return current;
            }
            const next = new Set(current);
            next.delete(id);
            return next;
          });
          // Re-opened drafts start with a step editor; keep Save disabled until notified.
          setEditingStepByDraftId((current) => new Map(current).set(id, true));
        };

        const setDraftEditingStep = (id: string, isEditing: boolean) => {
          setEditingStepByDraftId((current) => {
            if (current.get(id) === isEditing) {
              return current;
            }
            return new Map(current).set(id, isEditing);
          });
        };

        if (drafts.length === 0) {
          return null;
        }

        return (
          <>
            {drafts.map((draft) => {
              const isCollapsed = collapsedDraftIds.has(draft.id);
              const isEditingStep = editingStepByDraftId.get(draft.id) !== false;
              const closeLabel = i18n.translate(
                'xpack.alertingV2.actionPolicy.form.simpleWorkflow.close',
                { defaultMessage: 'Close simple workflow draft' }
              );
              const removeLabel = i18n.translate(
                'xpack.alertingV2.actionPolicy.form.simpleWorkflow.remove',
                { defaultMessage: 'Remove simple workflow' }
              );
              const saveSimpleWorkflowLabel = i18n.translate(
                'xpack.alertingV2.actionPolicy.form.simpleWorkflow.saveSimpleWorkflow',
                { defaultMessage: 'Save simple workflow' }
              );
              const saveDisabledTooltip = i18n.translate(
                'xpack.alertingV2.actionPolicy.form.simpleWorkflow.saveDisabledWhileEditingStep',
                {
                  defaultMessage: 'Finish editing the step before saving this simple workflow',
                }
              );
              const editLabel = i18n.translate(
                'xpack.alertingV2.actionPolicy.form.simpleWorkflow.edit',
                { defaultMessage: 'Edit simple workflow draft' }
              );
              const workflowNameLabel = i18n.translate(
                'xpack.alertingV2.actionPolicy.form.simpleWorkflow.workflowName',
                { defaultMessage: 'Workflow name' }
              );
              const stepIcons = draft.steps
                .map((step) => getInlineActionStepDefinition(step.stepType)?.iconType)
                .filter((iconType): iconType is string => Boolean(iconType));

              return (
                <EuiFlexItem key={draft.id}>
                  <EuiPanel
                    hasBorder
                    hasShadow={false}
                    paddingSize="m"
                    data-test-subj={`simpleWorkflowRow-${draft.id}`}
                  >
                    <EuiFlexGroup
                      alignItems="center"
                      justifyContent="spaceBetween"
                      gutterSize="s"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                          <EuiFlexItem
                            grow={false}
                            css={
                              isCollapsed
                                ? undefined
                                : {
                                    flex: '1 1 auto',
                                    minWidth: 280,
                                    maxWidth: 480,
                                  }
                            }
                          >
                            {isCollapsed ? (
                              <EuiText size="s">
                                <strong>{draft.workflowName}</strong>
                              </EuiText>
                            ) : (
                              <EuiFieldText
                                compressed
                                fullWidth
                                prepend={<EuiIcon type="workflow" />}
                                value={draft.workflowName}
                                onChange={(event) =>
                                  updateDraft({ ...draft, workflowName: event.target.value })
                                }
                                aria-label={workflowNameLabel}
                                placeholder={i18n.translate(
                                  'xpack.alertingV2.actionPolicy.form.simpleWorkflow.workflowNamePlaceholder',
                                  { defaultMessage: 'Enter a workflow name' }
                                )}
                                data-test-subj={`simpleWorkflowName-${draft.id}`}
                              />
                            )}
                          </EuiFlexItem>
                          {isCollapsed &&
                            stepIcons.map((iconType, index) => (
                              <EuiFlexItem
                                grow={false}
                                key={`${draft.id}-icon-${iconType}-${index}`}
                              >
                                <EuiIcon type={iconType} size="m" aria-hidden />
                              </EuiFlexItem>
                            ))}
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                          {isCollapsed ? (
                            <EuiFlexItem grow={false}>
                              <EuiToolTip content={editLabel} disableScreenReaderOutput>
                                <EuiButtonIcon
                                  size="xs"
                                  display="empty"
                                  color="text"
                                  iconType="pencil"
                                  aria-label={editLabel}
                                  onClick={() => expandDraft(draft.id)}
                                  data-test-subj={`simpleWorkflowEdit-${draft.id}`}
                                />
                              </EuiToolTip>
                            </EuiFlexItem>
                          ) : (
                            <EuiFlexItem grow={false}>
                              <EuiToolTip
                                content={
                                  isEditingStep ? saveDisabledTooltip : saveSimpleWorkflowLabel
                                }
                                disableScreenReaderOutput
                              >
                                {/* Span keeps the tooltip working when the control is disabled. */}
                                <span>
                                  <EuiButtonIcon
                                    size="xs"
                                    display="fill"
                                    color="success"
                                    iconType="check"
                                    aria-label={saveSimpleWorkflowLabel}
                                    isDisabled={isEditingStep}
                                    onClick={() => collapseDraft(draft.id)}
                                    data-test-subj={`simpleWorkflowConfirm-${draft.id}`}
                                  />
                                </span>
                              </EuiToolTip>
                            </EuiFlexItem>
                          )}
                          <EuiFlexItem grow={false}>
                            <EuiToolTip
                              content={isCollapsed ? removeLabel : closeLabel}
                              disableScreenReaderOutput
                            >
                              <EuiButtonIcon
                                size="xs"
                                display="empty"
                                color={isCollapsed ? 'warning' : 'text'}
                                iconType={isCollapsed ? 'trash' : 'cross'}
                                aria-label={isCollapsed ? removeLabel : closeLabel}
                                onClick={() => removeDraft(draft.id)}
                                data-test-subj={
                                  isCollapsed
                                    ? `simpleWorkflowRemove-${draft.id}`
                                    : `simpleWorkflowClose-${draft.id}`
                                }
                              />
                            </EuiToolTip>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    {!isCollapsed && (
                      <>
                        <EuiSpacer size="m" />
                        <InlineWorkflowEditor
                          value={draft}
                          onChange={updateDraft}
                          allowCreateConnector={allowCreateConnector}
                          onEditingStepChange={(isEditing) =>
                            setDraftEditingStep(draft.id, isEditing)
                          }
                        />
                      </>
                    )}
                  </EuiPanel>
                </EuiFlexItem>
              );
            })}
          </>
        );
      }}
    />
  );
};
