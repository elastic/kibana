/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { CONTEXT_ENGINE_APP_ID } from '../../../../common/features';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { MAX_AI_INDEX_AUTOMATIONS } from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useAutomationsEditor } from '../../hooks/use_automations_editor';
import { useKibana } from '../../hooks/use_kibana';
import { useSuggestAutomation } from '../../hooks/use_suggest_automation';
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
  const { automations, workflowIds, isCreating, isBusy, deleteAutomation, createAndAttach } =
    useAutomationsEditor({ aiIndex, onSaved });
  const {
    summaries,
    isLoading: isLoadingSummaries,
    missingReadPrivilege,
  } = useWorkflowSummaries(workflowIds);
  const { canSuggest, suggestAutomation } = useSuggestAutomation({ aiIndex, isManaged, onSaved });
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const returnSearch = aiIndex ? `?${getWorkflowReturnSearch(aiIndex.id)}` : '';

  const handleCreate = async () => {
    setIsAddMenuOpen(false);
    const workflowId = await createAndAttach();
    if (workflowId) {
      application.navigateToApp(WORKFLOWS_APP_ID, {
        path: `/${encodeURIComponent(workflowId)}${returnSearch}`,
      });
    }
  };

  const handleSuggest = () => {
    setIsAddMenuOpen(false);
    suggestAutomation();
  };

  const canAddMore = automations.length < MAX_AI_INDEX_AUTOMATIONS;
  const hasAutomations = automations.length > 0;
  const createTooltip = !canAddMore
    ? i18n.translate('xpack.contextEngine.aiIndexDetail.automations.maxAutomationsTooltip', {
        defaultMessage: 'You have reached the maximum number of automations.',
      })
    : undefined;

  const addAutomationLabel = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.automations.addButton',
    {
      defaultMessage: 'Add automation',
    }
  );

  const menuItems = [
    ...(canSuggest
      ? [
          <EuiContextMenuItem
            key="suggest"
            icon="productAgent"
            onClick={handleSuggest}
            data-test-subj="contextSuggestAutomationButton"
            {...getEbtProps({
              element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
              action: CONTEXT_ENGINE_UI_EBT.action.automations.SUGGEST,
            })}
          >
            {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.suggestButton', {
              defaultMessage: 'Create with AI Agent',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      key="create"
      icon="workflow"
      onClick={handleCreate}
      disabled={isCreating || !canAddMore}
      toolTipContent={createTooltip}
      data-test-subj="contextCreateAutomationButton"
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
        action: CONTEXT_ENGINE_UI_EBT.action.automations.CREATE,
      })}
    >
      {/* We can't use the `external` prop because the menu item is a button and not a link  */}
      <>
        {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.createButton', {
          defaultMessage: 'Create workflow',
        })}

        <EuiIcon
          type="external"
          size="m"
          color={euiTheme.colors.textDisabled}
          css={css`
            margin-left: ${euiTheme.size.xs};
          `}
          aria-hidden={true}
        />
      </>
    </EuiContextMenuItem>,
  ];

  const renderAddAutomationButton = ({ fill }: { fill: boolean }) => (
    <EuiPopover
      panelPaddingSize="none"
      anchorPosition="downCenter"
      isOpen={isAddMenuOpen}
      closePopover={() => setIsAddMenuOpen(false)}
      aria-label={addAutomationLabel}
      button={
        <EuiButton
          size="s"
          fill={fill}
          iconType="chevronSingleDown"
          iconSide="right"
          isDisabled={isBusy || aiIndex === undefined}
          data-test-subj="contextAddAutomationButton"
          onClick={() => setIsAddMenuOpen((open) => !open)}
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.automations.ADD_MENU,
          })}
        >
          {addAutomationLabel}
        </EuiButton>
      }
    >
      <EuiContextMenuPanel items={menuItems} />
    </EuiPopover>
  );

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
        {!isManaged && !isLoading && hasAutomations && (
          <EuiFlexItem grow={false}>{renderAddAutomationButton({ fill: false })}</EuiFlexItem>
        )}
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
          {automations.length === 0 ? (
            <>
              <EuiSpacer size="m" />
              <AiIndexDetailPanelEmptyState
                iconType="workflow"
                dataTestSubj="contextAiIndexAutomationsEmpty"
                message={i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.automations.emptyBodyManaged',
                  { defaultMessage: 'No automations configured.' }
                )}
                action={isManaged ? undefined : renderAddAutomationButton({ fill: true })}
              />
            </>
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
                    isReadOnly={isManaged}
                    isDisabled={isBusy}
                    onDelete={() => deleteAutomation(automation.value)}
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
