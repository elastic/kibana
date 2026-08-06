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
import { AiButton } from '@kbn/shared-ux-ai-components';
import React from 'react';
import { CONTEXT_ENGINE_APP_ID } from '../../../../common/features';
import { MAX_AI_INDEX_AUTOMATIONS } from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useAutomationsEditor } from '../../hooks/use_automations_editor';
import { useKibana } from '../../hooks/use_kibana';
import { useSuggestAutomation } from '../../hooks/use_suggest_automation';
import { useWorkflowSummaries } from '../../hooks/use_workflow_summaries';
import { getAiIndexDetailPath } from '../../paths';
import { AutomationRow } from './automation_row';

/**
 * Builds the query string that tells the Workflows app to send its back button
 * here (to this AI index detail page) instead of the Workflows list.
 */
const getWorkflowReturnSearch = (aiIndexId: string): string =>
  new URLSearchParams({
    returnApp: CONTEXT_ENGINE_APP_ID,
    returnPath: getAiIndexDetailPath(aiIndexId),
  }).toString();

interface AutomationsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

export const AutomationsPanel = ({
  isLoading,
  aiIndex,
  onSaved,
  isManaged,
}: AutomationsPanelProps) => {
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
    removeAutomation,
    save,
    createAndAttach,
  } = useAutomationsEditor({ aiIndex, onSaved });
  const { summaries, isLoading: isLoadingSummaries } = useWorkflowSummaries(workflowIds);
  const { canSuggest, suggestAutomation } = useSuggestAutomation({ aiIndex, isManaged, onSaved });

  const returnSearch = aiIndex ? `?${getWorkflowReturnSearch(aiIndex.id)}` : '';

  const handleCreate = async () => {
    const workflowId = await createAndAttach();
    if (workflowId) {
      application.navigateToApp(WORKFLOWS_APP_ID, {
        path: `/${encodeURIComponent(workflowId)}${returnSearch}`,
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
          ) : !isManaged && !isLoading ? (
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {canSuggest && (
                <EuiFlexItem grow={false}>
                  <AiButton
                    size="s"
                    iconType="sparkles"
                    onClick={suggestAutomation}
                    data-test-subj="contextSuggestAutomationButton"
                  >
                    {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.suggestButton', {
                      defaultMessage: 'Suggest automation',
                    })}
                  </AiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="plusInCircle"
                  onClick={handleCreate}
                  isLoading={isCreating}
                  isDisabled={isBusy || !canAddMore}
                  title={i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.automations.createAutomationTooltip',
                    { defaultMessage: 'Create a new automation' }
                  )}
                  aria-label={i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.automations.createAutomationAriaLabel',
                    { defaultMessage: 'Create automation' }
                  )}
                  data-test-subj="contextCreateAutomationButton"
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.createButton', {
                    defaultMessage: 'Create automation',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="pencil"
                  onClick={startEditing}
                  isDisabled={aiIndex === undefined}
                  data-test-subj="contextEditAutomationsButton"
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.editButton', {
                    defaultMessage: 'Edit',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
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
                  {isManaged
                    ? i18n.translate(
                        'xpack.contextEngine.aiIndexDetail.automations.emptyBodyManaged',
                        { defaultMessage: 'No automations are configured for this AI index.' }
                      )
                    : i18n.translate('xpack.contextEngine.aiIndexDetail.automations.emptyBody', {
                        defaultMessage: 'Create an automation to get started.',
                      })}
                </p>
              }
            />
          ) : (
            automations.map((automation, index) => {
              const summary = summaries.get(automation.value);
              return (
                <React.Fragment key={automation.value}>
                  <AutomationRow
                    automation={automation}
                    name={summary?.name}
                    enabled={summary?.enabled}
                    editHref={application.getUrlForApp(WORKFLOWS_APP_ID, {
                      path: `/${encodeURIComponent(automation.value)}${returnSearch}`,
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
