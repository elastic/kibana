/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { MAX_AI_INDEX_AUTOMATIONS } from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useAutomationsEditor } from '../../hooks/use_automations_editor';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflowSummaries } from '../../hooks/use_workflow_summaries';
import { AddAutomationControls } from './add_automation_controls';
import { AutomationRow } from './automation_row';

interface AutomationsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export const AutomationsPanel = ({ isLoading, aiIndex, onSaved }: AutomationsPanelProps) => {
  const {
    services: { application },
  } = useKibana();
  const {
    isEditing,
    automations,
    workflowIds,
    isSaving,
    isCreating,
    isBusy,
    startEditing,
    stopEditing,
    addAutomation,
    removeAutomation,
    save,
    createAndAttach,
  } = useAutomationsEditor({ aiIndex, onSaved });
  const { summaries, isLoading: isLoadingSummaries } = useWorkflowSummaries(workflowIds);

  const handleCreate = async () => {
    const workflowId = await createAndAttach();
    if (workflowId) {
      application.navigateToApp(WORKFLOWS_APP_ID, {
        path: `/${encodeURIComponent(workflowId)}`,
      });
    }
  };

  const canAddMore = automations.length < MAX_AI_INDEX_AUTOMATIONS;

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
                  onClick={stopEditing}
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
                  onClick={save}
                  isLoading={isSaving}
                  isDisabled={isCreating}
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
            <AddAutomationControls
              attachedWorkflowIds={workflowIds}
              isCreating={isCreating}
              isCreateDisabled={isBusy || !canAddMore}
              onAdd={addAutomation}
              onCreate={handleCreate}
            />
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
                    defaultMessage: 'Add an existing workflow.',
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
                    editHref={application.getUrlForApp(WORKFLOWS_APP_ID, {
                      path: `/${encodeURIComponent(automation.value)}`,
                    })}
                    isEditing={isEditing}
                    isRemoveDisabled={isBusy}
                    onRemove={() => removeAutomation(automation.value)}
                  />
                  {index < automations.length - 1 && <EuiSpacer size="s" />}
                </React.Fragment>
              );
            })
          )}
        </>
      )}
    </EuiPanel>
  );
};
