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
import type {
  AiIndexAutomation,
  GetAiIndexResponse,
} from '../../../../common/http_api/ai_indices';
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
  onOpen,
  onRemove,
  isRemoving,
}: {
  automation: AiIndexAutomation;
  name: string | undefined;
  enabled: boolean | undefined;
  onOpen: () => void;
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
          onClick={onOpen}
          data-test-subj="contextOpenWorkflowButton"
        >
          {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.editWorkflowButton', {
            defaultMessage: 'Edit workflow',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
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
  const [isAdding, setIsAdding] = useState(false);

  const automations = aiIndex?.automations ?? [];
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
    }),
    [workflowIds]
  );

  const openWorkflow = (workflowId: string) => {
    application.navigateToApp(WORKFLOWS_APP_ID, { path: `/${encodeURIComponent(workflowId)}` });
  };

  const handleAdd = async (workflowId: string) => {
    if (!aiIndex || !workflowId) {
      return;
    }
    if (workflowIds.includes(workflowId)) {
      setIsAdding(false);
      return;
    }
    const next: AiIndexAutomation[] = [...automations, { type: 'workflow', value: workflowId }];
    const saved = await saveAutomations(aiIndex, next);
    if (saved) {
      setIsAdding(false);
      onSaved();
    }
  };

  const handleRemove = async (value: string) => {
    if (!aiIndex) {
      return;
    }
    const next = automations.filter((automation) => automation.value !== value);
    const saved = await saveAutomations(aiIndex, next);
    if (saved) {
      onSaved();
    }
  };

  const handleCreate = async () => {
    if (!aiIndex) {
      return;
    }
    const workflowId = await createWorkflow(buildStarterWorkflowYaml(aiIndex.id));
    if (!workflowId) {
      return;
    }
    const next: AiIndexAutomation[] = [...automations, { type: 'workflow', value: workflowId }];
    const saved = await saveAutomations(aiIndex, next);
    if (saved) {
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
        {!isAdding && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="plusInCircle"
                  onClick={() => setIsAdding(true)}
                  isDisabled={!canModify}
                  data-test-subj="contextAddAutomationButton"
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.addButton', {
                    defaultMessage: 'Add existing',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  size="s"
                  iconType="plusInCircle"
                  onClick={handleCreate}
                  isLoading={isCreating}
                  isDisabled={!canModify}
                  data-test-subj="contextCreateAutomationButton"
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.createButton', {
                    defaultMessage: 'Create automation',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
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
      {isAdding && (
        <>
          <WorkflowSelector onWorkflowChange={handleAdd} config={selectorConfig} />
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={() => setIsAdding(false)}
                isDisabled={isSaving}
                data-test-subj="contextCancelAddAutomationButton"
              >
                {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.cancelButton', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      {isLoading || isLoadingSummaries ? (
        <EuiSkeletonText lines={2} data-test-subj="contextAiIndexAutomationsLoading" />
      ) : automations.length === 0 ? (
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
        automations.map((automation, index) => {
          const summary = summaries.get(automation.value);
          return (
            <React.Fragment key={`${automation.type}-${automation.value}-${index}`}>
              <AutomationRow
                automation={automation}
                name={summary?.name}
                enabled={summary?.enabled}
                onOpen={() => openWorkflow(automation.value)}
                onRemove={() => handleRemove(automation.value)}
                isRemoving={isBusy}
              />
              {index < automations.length - 1 && <EuiSpacer size="s" />}
            </React.Fragment>
          );
        })
      )}
    </EuiPanel>
  );
};
