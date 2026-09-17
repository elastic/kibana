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
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import type { TraceSpan } from '@kbn/llm-trace-waterfall';
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
import { useToasts } from '../../../hooks/use_toasts';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { RoundTraceFlyout } from '../conversation_rounds/round_response/round_trace_flyout';

const triggerDownload = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('FileReader did not return a string'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsText(file);
  });

const exportLabels = {
  downloadConversation: i18n.translate(
    'xpack.agentBuilder.conversationActions.downloadConversation',
    { defaultMessage: 'Download conversation JSON' }
  ),
  loadTrace: i18n.translate('xpack.agentBuilder.conversationActions.loadTrace', {
    defaultMessage: 'Load trace from file',
  }),
  loadTraceErrorTitle: i18n.translate(
    'xpack.agentBuilder.conversationActions.loadTraceErrorTitle',
    { defaultMessage: 'Could not load trace file' }
  ),
  loadTraceErrorBody: i18n.translate(
    'xpack.agentBuilder.conversationActions.loadTraceErrorBody',
    { defaultMessage: 'The file does not contain a valid trace. Expected a JSON array of spans or an object with a "spans" array.' }
  ),
};

const fullscreenLabels = {
  actions: i18n.translate('xpack.agentBuilder.conversationActions.actions', {
    defaultMessage: 'More',
  }),
  actionsAriaLabel: i18n.translate('xpack.agentBuilder.conversationActions.actionsAriaLabel', {
    defaultMessage: 'More',
  }),
  agentDetails: i18n.translate('xpack.agentBuilder.conversationActions.agentDetails', {
    defaultMessage: 'Agent details',
  }),
  genAiSettings: i18n.translate('xpack.agentBuilder.conversationActions.genAiSettings', {
    defaultMessage: 'GenAI Settings',
  }),
  externalLinkAriaLabel: i18n.translate(
    'xpack.agentBuilder.conversationActions.externalLinkAriaLabel',
    {
      defaultMessage: 'Open in new tab',
    }
  ),
  view: i18n.translate('xpack.agentBuilder.conversationActions.viewSection', {
    defaultMessage: 'View',
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
};

interface MoreActionsButtonProps {
  onCloseSidebar?: () => void;
}

export const MoreActionsButton: React.FC<MoreActionsButtonProps> = ({ onCloseSidebar }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isTraceFlyoutOpen, setIsTraceFlyoutOpen] = useState(false);
  const [menuLoadedSpans, setMenuLoadedSpans] = useState<TraceSpan[] | null>(null);
  const traceFileInputRef = useRef<HTMLInputElement>(null);

  const agentId = useAgentId();
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();
  const { isEmbeddedContext } = useConversationContext();
  const conversationId = useConversationId();
  const { manageAgents } = useUiPrivileges();
  const isExperimentalEnabled = useExperimentalFeatures();
  const { conversation } = useConversation();
  const conversationRounds = useConversationRounds();
  const { agent } = useAgentBuilderAgentById(agentId ?? undefined);
  const { addErrorToast } = useToasts();

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

  const onAddConversationToDataset = useCallback(() => {
    if (!getAddToDatasetAction) return;

    setIsPopoverOpen(false);
    getAddToDatasetAction({
      label: fullscreenLabels.addToDataset,
      title: fullscreenLabels.addToDataset,
      initialExamples: completedRounds.map(({ round, roundIndex }) => {
        const message =
          typeof round.input?.message === 'string' && round.input.message.trim()
            ? round.input.message.trim()
            : fullscreenLabels.emptyMessage;

        const shortMessage = message.length > 80 ? `${message.slice(0, 77).trimEnd()}…` : message;

        const traceId =
          round.trace_id == null
            ? null
            : Array.isArray(round.trace_id)
            ? round.trace_id[0] ?? null
            : round.trace_id;

        return {
          label: i18n.translate('xpack.agentBuilder.conversationActions.turnLabel', {
            defaultMessage: 'Turn {turn}: {message}',
            values: { turn: roundIndex + 1, message: shortMessage },
          }),
          input: { round },
          output: { steps: round.steps },
          metadata: {
            source: 'agent_builder',
            conversation_id: conversation?.id ?? null,
            turn_index: roundIndex,
            trace_id: traceId,
          },
          selected: true,
        };
      }),
    })?.onClick();
  }, [completedRounds, conversation?.id, getAddToDatasetAction]);

  const showAddToDatasetItem =
    isExperimentalEnabled && plugins.evals?.canAddToDataset && completedRounds.length > 0;

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleOpenFullScreen = useCallback(() => {
    if (!application) return;
    if (!conversationId) return;

    setIsPopoverOpen(false);
    onCloseSidebar?.();

    const path = conversationId
      ? appPaths.agent.conversations.byId({ agentId: agentId!, conversationId: conversationId! })
      : appPaths.agent.conversations.new({ agentId: agentId! });

    navigateToAgentBuilderUrl(path, undefined, { entryPointSource: 'inapp_escalation' });
  }, [application, conversationId, onCloseSidebar, agentId, navigateToAgentBuilderUrl]);

  const handleDownloadConversation = useCallback(() => {
    if (!conversation) return;
    setIsPopoverOpen(false);
    const payload = {
      conversation_id: conversationId ?? null,
      agent,
      conversation,
      rounds: conversationRounds,
    };
    const filename = conversationId ? `conversation-${conversationId}.json` : 'conversation.json';
    triggerDownload(filename, JSON.stringify(payload, null, 2));
  }, [conversation, conversationId, agent, conversationRounds]);

  const handleLoadTrace = useCallback(() => {
    setIsPopoverOpen(false);
    traceFileInputRef.current?.click();
  }, []);

  const handleTraceFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed: unknown = JSON.parse(text);
      const spans: unknown = Array.isArray(parsed)
        ? parsed
        : parsed !== null && typeof parsed === 'object' && 'spans' in parsed
        ? (parsed as { spans: unknown }).spans
        : null;
      if (Array.isArray(spans)) {
        setMenuLoadedSpans(spans as TraceSpan[]);
        setIsTraceFlyoutOpen(true);
      } else {
        addErrorToast({ title: exportLabels.loadTraceErrorTitle, text: exportLabels.loadTraceErrorBody });
      }
    } catch {
      addErrorToast({ title: exportLabels.loadTraceErrorTitle, text: exportLabels.loadTraceErrorBody });
    }
  }, []);

  const fullScreenMenuItemLabel = useMemo(() => {
    if (conversationId) {
      return fullscreenLabels.fullScreen;
    }
    return (
      <EuiToolTip content={fullscreenLabels.fullScreenDisabledTooltip}>
        <span tabIndex={0}>{fullscreenLabels.fullScreen}</span>
      </EuiToolTip>
    );
  }, [conversationId]);

  const exportMenuItems = [
    ...(conversation
      ? [
          <EuiContextMenuItem
            key="downloadConversation"
            icon="download"
            data-test-subj="agentBuilderDownloadConversationButton"
            onClick={handleDownloadConversation}
          >
            {exportLabels.downloadConversation}
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      key="loadTrace"
      icon="upload"
      data-test-subj="agentBuilderLoadTraceButton"
      onClick={handleLoadTrace}
    >
      {exportLabels.loadTrace}
    </EuiContextMenuItem>,
  ];

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
          {fullscreenLabels.addToDataset}
        </EuiContextMenuItem>,
      ]
    : [];

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
      {fullscreenLabels.agentDetails}
    </EuiContextMenuItem>,
    ...(isEmbeddedContext && application
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
            {fullscreenLabels.genAiSettings}
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
    'aria-label': fullscreenLabels.actionsAriaLabel,
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
        ref={traceFileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleTraceFileChange}
        data-test-subj="moreActionsTraceFileInput"
      />
      <EuiPopover
        button={<EuiButtonIcon {...buttonProps} />}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        aria-label={fullscreenLabels.actionsAriaLabel}
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
      {isTraceFlyoutOpen && (
        <RoundTraceFlyout
          initialSpans={menuLoadedSpans ?? undefined}
          onClose={() => {
            setIsTraceFlyoutOpen(false);
            setMenuLoadedSpans(null);
          }}
        />
      )}
    </>
  );
};
