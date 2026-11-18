/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import React, { useMemo } from 'react';
import { isDreamingAutomation } from '../../../../common/dreaming';
import { CONTEXT_ENGINE_APP_ID } from '../../../../common/features';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useAutomationsEditor } from '../../hooks/use_automations_editor';
import { useKibana } from '../../hooks/use_kibana';
import { useMemoryEnabled } from '../../hooks/use_memory_enabled';
import { useWorkflowSummaries } from '../../hooks/use_workflow_summaries';
import { getAiIndexDetailPath } from '../../paths';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';
import { AiIndexDetailPanelEmptyState } from './ai_index_detail_panel_empty_prompt';
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
  const { automations, isBusy, deleteAutomation } = useAutomationsEditor({ aiIndex, onSaved });
  const isMemoryEnabled = useMemoryEnabled();
  const visibleAutomations = useMemo(
    () =>
      isMemoryEnabled
        ? automations
        : automations.filter((automation) => !isDreamingAutomation(automation)),
    [automations, isMemoryEnabled]
  );
  const visibleWorkflowIds = useMemo(
    () =>
      visibleAutomations
        .filter((automation) => automation.type === 'workflow')
        .map((automation) => automation.value),
    [visibleAutomations]
  );
  const {
    summaries,
    isLoading: isLoadingSummaries,
    missingReadPrivilege,
  } = useWorkflowSummaries(visibleWorkflowIds);
  const { canExecuteWorkflow } = useWorkflowsCapabilities();

  const returnSearch = aiIndex ? `?${getWorkflowReturnSearch(aiIndex.id)}` : '';

  const hasAutomations = visibleAutomations.length > 0;

  const panelDescription = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.automations.description',
    {
      defaultMessage: 'Automations keep Knowledge Indicators current as your sources change.',
    }
  );

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
          <AiIndexDetailPanelDescription>{panelDescription}</AiIndexDetailPanelDescription>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {missingReadPrivilege && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            title={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.automations.missingWorkflowPrivilege',
              {
                defaultMessage: 'You need the Workflows read privilege to see automation details.',
              }
            )}
            data-test-subj="contextAutomationsMissingPrivilegeCallout"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {isLoading || isLoadingSummaries ? (
        <EuiSkeletonText lines={2} data-test-subj="contextAiIndexAutomationsLoading" />
      ) : (
        <>
          {!hasAutomations ? (
            <>
              <EuiSpacer size="m" />
              <AiIndexDetailPanelEmptyState
                iconType="workflow"
                dataTestSubj="contextAiIndexAutomationsEmpty"
                message={i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.automations.emptyBodyManaged',
                  { defaultMessage: 'No automations configured.' }
                )}
              />
            </>
          ) : (
            visibleAutomations.map((automation, index) => {
              const summary = summaries.get(automation.value);
              return (
                <React.Fragment key={automation.value}>
                  <AutomationRow
                    automation={automation}
                    workflowSummary={summary}
                    editHref={application.getUrlForApp(WORKFLOWS_APP_ID, {
                      path: `/${encodeURIComponent(automation.value)}${returnSearch}`,
                    })}
                    isReadOnly={isManaged}
                    isBusy={isBusy}
                    canRun={canExecuteWorkflow}
                    onDelete={() => deleteAutomation(automation.value)}
                  />
                  {index < visibleAutomations.length - 1 && <EuiSpacer size="s" />}
                </React.Fragment>
              );
            })
          )}
        </>
      )}
    </EuiPanel>
  );
};
