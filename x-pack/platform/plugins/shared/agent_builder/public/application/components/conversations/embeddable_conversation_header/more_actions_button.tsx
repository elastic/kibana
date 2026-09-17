/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiContextMenuItem,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useNavigation } from '../../../hooks/use_navigation';
import {
  useAgentId,
  useConversation,
  useConversationRounds,
} from '../../../hooks/use_conversation';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useKibana } from '../../../hooks/use_kibana';
import { appPaths } from '../../../utils/app_paths';
import { useHasConnectorsAllPrivileges } from '../../../hooks/use_has_connectors_all_privileges';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useLoadTraceFromFile } from '../../../hooks/use_load_trace_from_file';
import { RoundTraceFlyout } from '../conversation_rounds/round_response/round_trace_flyout';
import { triggerDownload } from '../../../utils/download';
import { normalizeTraceId } from '../../../utils/trace_utils';

const ADD_TO_DATASET_METADATA_SOURCE = 'agent_builder' as const;

const labels = {
  actionsAriaLabel: i18n.translate('xpack.agentBuilder.conversationActions.actionsAriaLabel', {
    defaultMessage: 'More',
  }),
  agentDetails: i18n.translate('xpack.agentBuilder.conversationActions.agentDetails', {
    defaultMessage: 'Agent details',
  }),
  genAiSettings: i18n.translate('xpack.agentBuilder.conversationActions.genAiSettings', {
    defaultMessage: 'GenAI Settings',
  }),
  fullScreen: i18n.translate('xpack.agentBuilder.conversationActions.fullScreen', {
    defaultMessage: 'Open in full screen',
  }),
  fullScreenDisabledTooltip: i18n.translate(
    'xpack.agentBuilder.conversationActions.fullScreenDisabledTooltip',
    {
      defaultMessage: 'Full-screen mode is available once this conversation has been created.',
    }
  ),
  addToDataset: i18n.translate('xpack.agentBuilder.conversationActions.addToDataset', {
    defaultMessage: 'Add conversation to dataset',
  }),
  emptyMessage: i18n.translate('xpack.agentBuilder.conversationActions.emptyMessage', {
    defaultMessage: '(no message)',
  }),
  downloadConversation: i18n.translate(
    'xpack.agentBuilder.conversationActions.downloadConversation',
    { defaultMessage: 'Download conversation JSON' }
  ),
  loadTrace: i18n.translate('xpack.agentBuilder.conversationActions.loadTrace', {
    defaultMessage: 'Load trace from file',
  }),
};

interface MoreActionsButtonProps {
  onCloseSidebar?: () => void;
}

export const MoreActionsButton: React.FC<MoreActionsButtonProps> = ({ onCloseSidebar }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const agentId = useAgentId();
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();
  const { isEmbeddedContext } = useConversationContext();
  const conversationId = useConversationId();
  const { manageAgents } = useUiPrivileges();
  const isExperimentalEnabled = useExperimentalFeatures();
  const { conversation } = useConversation();
  const conversationRounds = useConversationRounds();
  const { agent, isLoading: isAgentLoading } = useAgentBuilderAgentById(agentId ?? undefined);
  const { openFilePicker, isFlyoutOpen, loadedSpans, closeFlyout, fileInputRef, handleFileChange } =
    useLoadTraceFromFile();

  const {
    services: { application, plugins },
  } = useKibana();
  const hasAccessToGenAiSettings = useHasConnectorsAllPrivileges();

  const getAddToDatasetAction = plugins.evals?.getAddToDatasetAction;

  const completedRounds = useMemo(() => {
    return conversationRounds.flatMap((round, roundIndex) => {
      if (!round.response?.message) return [];
      return [{ round, roundIndex }];
    });
  }, [conversationRounds]);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);

  const onAddConversationToDataset = useCallback(() => {
    if (!getAddToDatasetAction) return;
    setIsPopoverOpen(false);
    getAddToDatasetAction({
      label: labels.addToDataset,
      title: labels.addToDataset,
      initialExamples: completedRounds.map(({ round, roundIndex }) => {
        const message =
          typeof round.input?.message === 'string' && round.input.message.trim()
            ? round.input.message.trim()
            : labels.emptyMessage;
        const shortMessage = message.length > 80 ? `${message.slice(0, 77).trimEnd()}…` : message;
        return {
          label: i18n.translate('xpack.agentBuilder.conversationActions.turnLabel', {
            defaultMessage: 'Turn {turn}: {message}',
            values: { turn: roundIndex + 1, message: shortMessage },
          }),
          input: { round },
          output: { steps: round.steps },
          metadata: {
            source: ADD_TO_DATASET_METADATA_SOURCE,
            conversation_id: conversation?.id ?? null,
            turn_index: roundIndex,
            trace_id: normalizeTraceId(round.trace_id) ?? null,
          },
          selected: true,
        };
      }),
    })?.onClick();
  }, [completedRounds, conversation?.id, getAddToDatasetAction]);

  const handleOpenFullScreen = useCallback(() => {
    if (!application || !conversationId) return;
    setIsPopoverOpen(false);
    onCloseSidebar?.();
    navigateToAgentBuilderUrl(
      appPaths.agent.conversations.byId({ agentId: agentId!, conversationId }),
      undefined,
      { entryPointSource: 'inapp_escalation' }
    );
  }, [application, conversationId, onCloseSidebar, agentId, navigateToAgentBuilderUrl]);

  const handleDownloadConversation = useCallback(() => {
    if (!conversation) return;
    setIsPopoverOpen(false);
    const titleSlug = conversation.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const filename = titleSlug ? `conversation-${titleSlug}.json` : 'conversation.json';
    triggerDownload(
      filename,
      JSON.stringify(
        {
          conversation_id: conversationId ?? null,
          agent,
          conversation,
          rounds: conversationRounds,
        },
        null,
        2
      )
    );
  }, [conversation, conversationId, agent, conversationRounds]);

  const handleLoadTrace = useCallback(() => {
    setIsPopoverOpen(false);
    openFilePicker();
  }, [openFilePicker]);

  const fullScreenMenuItemLabel = useMemo(() => {
    if (conversationId) return labels.fullScreen;
    return (
      <EuiToolTip content={labels.fullScreenDisabledTooltip}>
        <span tabIndex={0}>{labels.fullScreen}</span>
      </EuiToolTip>
    );
  }, [conversationId]);

  const showAddToDatasetItem =
    isExperimentalEnabled && plugins.evals?.canAddToDataset && completedRounds.length > 0;

  const addToDatasetMenuItem = showAddToDatasetItem
    ? [
        <EuiContextMenuItem
          key="addConversationToDataset"
          icon="flask"
          data-test-subj="agentBuilderAddConversationToDataset"
          onClick={onAddConversationToDataset}
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.ADD_TO_DATASET,
            detail: 'conversation',
          })}
        >
          {labels.addToDataset}
        </EuiContextMenuItem>,
      ]
    : [];

  const exportMenuItems = [
    ...(conversation
      ? [
          <EuiContextMenuItem
            key="downloadConversation"
            icon="download"
            disabled={isAgentLoading}
            data-test-subj="agentBuilderDownloadConversationButton"
            onClick={handleDownloadConversation}
          >
            {labels.downloadConversation}
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      key="loadTrace"
      icon="upload"
      data-test-subj="agentBuilderLoadTraceButton"
      onClick={handleLoadTrace}
    >
      {labels.loadTrace}
    </EuiContextMenuItem>,
  ];

  const embeddedContextMenuItems = [
    <EuiContextMenuItem
      key="view-current-agent"
      icon="info"
      disabled={!manageAgents}
      onClick={closePopover}
      href={agentId ? createAgentBuilderUrl(appPaths.agent.overview({ agentId })) : undefined}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.AGENT_DETAILS,
        detail: 'conversation',
      })}
    >
      {labels.agentDetails}
    </EuiContextMenuItem>,
    ...(application
      ? [
          <EuiContextMenuItem
            key="full-screen"
            icon="fullScreen"
            disabled={!conversationId}
            data-test-subj="agentBuilderFullScreenMenuItem"
            onClick={handleOpenFullScreen}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.inappChat.OPEN_FULLSCREEN,
            })}
          >
            {fullScreenMenuItemLabel}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(hasAccessToGenAiSettings
      ? [
          <EuiContextMenuItem
            key="agentBuilderSettings"
            icon="gear"
            onClick={closePopover}
            href={application.getUrlForApp('management', { path: '/ai/genAiSettings' })}
            data-test-subj="agentBuilderGenAiSettingsButton"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.conversation.GENAI_SETTINGS,
              detail: 'conversation',
            })}
          >
            {labels.genAiSettings}
          </EuiContextMenuItem>,
        ]
      : []),
    ...addToDatasetMenuItem,
    ...exportMenuItems,
  ];

  const fullscreenMenuItems = [...addToDatasetMenuItem, ...exportMenuItems];

  const menuItems = isEmbeddedContext ? embeddedContextMenuItems : fullscreenMenuItems;

  const buttonProps = {
    iconType: 'boxesVertical' as const,
    color: 'text' as const,
    size: 's' as const,
    'aria-label': labels.actionsAriaLabel,
    onClick: togglePopover,
    'data-test-subj': 'agentBuilderMoreActionsButton',
    ...getEbtProps({
      element: AGENT_BUILDER_UI_EBT.element.pageContent,
      action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_MORE_ACTIONS,
      detail: 'conversation',
    }),
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-test-subj="moreActionsTraceFileInput"
      />
      <EuiPopover
        button={<EuiButtonIcon {...buttonProps} />}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        aria-label={labels.actionsAriaLabel}
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
      {isFlyoutOpen && (
        <RoundTraceFlyout initialSpans={loadedSpans ?? undefined} onClose={closeFlyout} />
      )}
    </>
  );
};
