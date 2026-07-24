/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WorkflowListDto } from '@kbn/workflows';
import { WorkflowSelector } from '@kbn/workflows-ui';
import React, { useMemo, useState } from 'react';
import { MAX_AI_INDEX_AUTOMATIONS } from '../../../../common/constants';
import type { AiIndexAutomation, GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useCreateWorkflow } from '../../hooks/use_create_workflow';
import { useKibana } from '../../hooks/use_kibana';
import { useSaveAiIndexAutomations } from '../../hooks/use_save_ai_index_automations';
import { useWorkflowSummaries } from '../../hooks/use_workflow_summaries';
import { buildStarterWorkflowYaml } from '../../utils/starter_workflow_yaml';

const WORKFLOWS_APP_ID = 'workflows';

const AutomationRow = ({
  automation,
  name,
  enabled,
  editHref,
  editable,
  onRemove,
  isRemoving,
}: {
  automation: AiIndexAutomation;
  name: string | undefined;
  enabled: boolean | undefined;
  editHref: string;
  editable: boolean;
  onRemove: () => void;
  isRemoving: boolean;
}) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="contextAiIndexAutomationRow">
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="indexRuntime" size="l" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem css={{ minWidth: 0 }}>
        <EuiText size="s" className="eui-textTruncate">
          {name ?? automation.value}
        </EuiText>
      </EuiFlexItem>
      {enabled !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiBadge color={enabled ? 'success' : 'hollow'}>
            {enabled
              ? i18n.translate('xpack.contextEngine.aiIndexDetail.automations.enabledBadge', {
                  defaultMessage: 'Enabled',
                })
              : i18n.translate('xpack.contextEngine.aiIndexDetail.automations.disabledBadge', {
                  defaultMessage: 'Disabled',
                })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="popout"
          iconSide="right"
          href={editHref}
          target="_blank"
          data-test-subj="contextOpenWorkflowButton"
        >
          {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.editWorkflowButton', {
            defaultMessage: 'Edit workflow',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {editable && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.automations.removeButtonAriaLabel',
              {
                defaultMessage: 'Remove automation {name}',
                values: { name: name ?? automation.value },
              }
            )}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              onClick={onRemove}
              isDisabled={isRemoving}
              data-test-subj="contextRemoveAutomationButton"
              aria-label={i18n.translate(
                'xpack.contextEngine.aiIndexDetail.automations.removeButtonAriaLabel',
                {
                  defaultMessage: 'Remove automation {name}',
                  values: { name: name ?? automation.value },
                }
              )}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </EuiPanel>
);

interface AutomationsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export const AutomationsPanel = ({ isLoading, aiIndex, onSaved }: AutomationsPanelProps) => {
  const {
    services: { application },
  } = useKibana();
  const { saveAutomations, isSaving } = useSaveAiIndexAutomations();
  const { createWorkflow, isCreating } = useCreateWorkflow();
  const [isEditing, setIsEditing] = useState(false);
  // While editing, changes accumulate in this draft and are persisted on Save.
  const [draftAutomations, setDraftAutomations] = useState<AiIndexAutomation[]>([]);

  const savedAutomations = aiIndex?.automations ?? [];
  const automations = isEditing ? draftAutomations : savedAutomations;
  const workflowIds = automations
    .filter((automation) => automation.type === 'workflow')
    .map((automation) => automation.value);
  const { summaries, isLoading: isLoadingSummaries } = useWorkflowSummaries(workflowIds);

  // Exclude already-attached workflows so they can't be picked twice.
  const selectorConfig = useMemo(
    () => ({
      label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.selectorLabel', {
        defaultMessage: 'Select an existing workflow',
      }),
      filterFunction: (workflows: WorkflowListDto['results']) =>
        workflows.filter((workflow) => !workflowIds.includes(workflow.id)),
      hideTopRowHeader: true,
    }),
    [workflowIds]
  );

  const openWorkflow = (workflowId: string) => {
    application.navigateToApp(WORKFLOWS_APP_ID, { path: `/${encodeURIComponent(workflowId)}` });
  };

  const startEditing = () => {
    setDraftAutomations(savedAutomations);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleAdd = (workflowId: string) => {
    if (!workflowId || workflowIds.includes(workflowId)) {
      return;
    }
    setDraftAutomations((current) => [...current, { type: 'workflow', value: workflowId }]);
  };

  const handleRemove = (value: string) => {
    setDraftAutomations((current) => current.filter((automation) => automation.value !== value));
  };

  const handleSave = async () => {
    if (!aiIndex) {
      return;
    }
    const saved = await saveAutomations(aiIndex, draftAutomations);
    if (saved) {
      setIsEditing(false);
      onSaved();
    }
  };

  // Creating a workflow is a real backend action that navigates away, so it
  // persists the draft (including the new automation) before leaving.
  const handleCreate = async () => {
    if (!aiIndex) {
      return;
    }
    const workflowId = await createWorkflow(buildStarterWorkflowYaml(aiIndex.id));
    if (!workflowId) {
      return;
    }
    const next: AiIndexAutomation[] = [
      ...draftAutomations,
      { type: 'workflow', value: workflowId },
    ];
    const saved = await saveAutomations(aiIndex, next);
    if (saved) {
      setIsEditing(false);
      onSaved();
      openWorkflow(workflowId);
    }
  };

  const isBusy = isSaving || isCreating;
  const canModify =
    aiIndex !== undefined && !isBusy && automations.length < MAX_AI_INDEX_AUTOMATIONS;

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.title', {
                defaultMessage: 'Automations',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isEditing ? (
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  onClick={cancelEditing}
                  isDisabled={isBusy}
                  data-test-subj="contextCancelEditingAutomationsButton"
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.cancelButton', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  size="s"
                  onClick={handleSave}
                  isLoading={isSaving}
                  isDisabled={aiIndex === undefined || isCreating}
                  data-test-subj="contextSaveAutomationsButton"
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.saveButton', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiButton
              size="s"
              iconType="pencil"
              onClick={startEditing}
              isDisabled={aiIndex === undefined}
              data-test-subj="contextEditAutomationsButton"
            >
              {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.editButton', {
                defaultMessage: 'Edit',
              })}
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.description', {
            defaultMessage:
              "Automations extract and refresh this AI index's Knowledge Indicators from its sources.",
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {isLoading || isLoadingSummaries ? (
        <EuiSkeletonText lines={2} data-test-subj="contextAiIndexAutomationsLoading" />
      ) : (
        <>
          {isEditing && (
            <>
              <EuiText size="s">
                <strong>
                  {i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.automations.addExistingLabel',
                    {
                      defaultMessage: 'Add an existing automation',
                    }
                  )}
                </strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <WorkflowSelector onWorkflowChange={handleAdd} config={selectorConfig} />
              <EuiSpacer size="m" />
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="popout"
                    iconSide="right"
                    onClick={handleCreate}
                    isLoading={isCreating}
                    isDisabled={!canModify}
                    data-test-subj="contextCreateAutomationButton"
                  >
                    {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.createButton', {
                      defaultMessage: 'Create a new automation',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.createHint', {
                      defaultMessage: 'Opens the workflow editor in a new page.',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="m" />
            </>
          )}
          {automations.length === 0 && !isEditing ? (
            <EuiEmptyPrompt
              iconType="indexRuntime"
              titleSize="xs"
              data-test-subj="contextAiIndexAutomationsEmpty"
              title={
                <h3>
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.emptyTitle', {
                    defaultMessage: 'No automations yet',
                  })}
                </h3>
              }
              body={
                <p>
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.emptyBody', {
                    defaultMessage: 'Add an existing workflow to keep this AI index up to date.',
                  })}
                </p>
              }
            />
          ) : (
            <>
              {automations.map((automation, index) => {
                const summary = summaries.get(automation.value);
                return (
                  <React.Fragment key={`${automation.type}-${automation.value}-${index}`}>
                    <AutomationRow
                      automation={automation}
                      name={summary?.name}
                      enabled={summary?.enabled}
                      editHref={application.getUrlForApp(WORKFLOWS_APP_ID, {
                        path: `/${encodeURIComponent(automation.value)}`,
                      })}
                      editable={isEditing}
                      onRemove={() => handleRemove(automation.value)}
                      isRemoving={isBusy}
                    />
                    {index < automations.length - 1 && <EuiSpacer size="s" />}
                  </React.Fragment>
                );
              })}
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};
