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
  EuiHorizontalRule,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AGENT_BUILDER_UI_EBT, DEFAULT_CONVERSATION_TITLE } from '@kbn/agent-builder-common';
import { downloadFileAs } from '@kbn/share-plugin/public';
import { getEbtProps } from '@kbn/ebt-click';
import { useNavigation } from '../../../hooks/use_navigation';
import { useAgentId, useConversation, useConversationTitle } from '../../../hooks/use_conversation';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useKibana } from '../../../hooks/use_kibana';
import { appPaths } from '../../../utils/app_paths';
import { useHasConnectorsAllPrivileges } from '../../../hooks/use_has_connectors_all_privileges';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useLoadTraceFromFile } from '../../../hooks/use_load_trace_from_file';
import { ActivityLogFlyout } from '../activity_log/activity_log_flyout';
import { useActivityLogView } from '../activity_log/activity_log_view_context';
import { isListedActivityEvent } from '../activity_log/to_activity_items';
import { TraceFlyout } from '../timeline/response/trace_flyout';

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
  downloadConversation: i18n.translate(
    'xpack.agentBuilder.conversationActions.downloadConversation',
    {
      defaultMessage: 'Download conversation',
    }
  ),
  activityLog: i18n.translate('xpack.agentBuilder.conversationActions.activityLog', {
    defaultMessage: 'Activity log',
  }),
  activityLogNoActivityTooltip: i18n.translate(
    'xpack.agentBuilder.conversationActions.activityLogNoActivityTooltip',
    {
      defaultMessage: 'No activity has been recorded for this conversation.',
    }
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
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const embeddedActivityLog = useActivityLogView();
  const moreActionsButtonRef = useRef<HTMLButtonElement>(null);

  const agentId = useAgentId();
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();
  const { isEmbeddedContext } = useConversationContext();
  const conversationId = useConversationId();

  useEffect(() => {
    setIsActivityLogOpen(false);
  }, [conversationId]);
  const { manageAgents } = useUiPrivileges();

  const {
    services: { application },
  } = useKibana();
  const hasAccessToGenAiSettings = useHasConnectorsAllPrivileges();

  const { conversation } = useConversation();
  const { title: conversationTitle } = useConversationTitle();

  const {
    openFilePicker,
    isFlyoutOpen: isTraceFlyoutOpen,
    loadedSpans,
    loadedTraceId,
    closeFlyout: closeTraceFlyout,
    fileInputRef,
    handleFileChange,
  } = useLoadTraceFromFile();

  const closePopover = () => setIsPopoverOpen(false);
  const togglePopover = () => setIsPopoverOpen((v) => !v);

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
    setIsPopoverOpen(false);
    const slug =
      conversationTitle
        .replace(/[^\p{L}\p{N}]+/gu, '-') // replace non-alphanumeric chars (unicode-aware) with hyphens
        .replace(/^-|-$/g, '') // strip leading/trailing hyphens
        .toLowerCase() || DEFAULT_CONVERSATION_TITLE;
    downloadFileAs(`${slug}.json`, {
      content: JSON.stringify({ conversation }, null, 2),
      type: 'application/json',
    });
  }, [conversationTitle, conversation]);

  const handleOpenActivityLog = useCallback(() => {
    setIsPopoverOpen(false);
    if (embeddedActivityLog) {
      embeddedActivityLog.open(moreActionsButtonRef.current);
      return;
    }
    setIsActivityLogOpen(true);
  }, [embeddedActivityLog]);

  const handleLoadTrace = useCallback(() => {
    setIsPopoverOpen(false);
    openFilePicker();
  }, [openFilePicker]);

  const fullScreenMenuItemLabel = useMemo(() => {
    if (conversationId) {
      return labels.fullScreen;
    }
    return (
      <EuiToolTip content={labels.fullScreenDisabledTooltip}>
        <span tabIndex={0}>{labels.fullScreen}</span>
      </EuiToolTip>
    );
  }, [conversationId]);

  const exportMenuItems = [
    <EuiContextMenuItem
      key="download-conversation"
      icon="download"
      disabled={!conversation}
      onClick={handleDownloadConversation}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.DOWNLOAD_CONVERSATION,
        detail: 'conversation',
      })}
    >
      {labels.downloadConversation}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="load-trace"
      icon="export"
      onClick={handleLoadTrace}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.LOAD_TRACE_FROM_FILE,
        detail: 'conversation',
      })}
    >
      {labels.loadTrace}
    </EuiContextMenuItem>,
  ];

  const hasActivity = useMemo(
    () => Boolean(conversation?.events?.some(isListedActivityEvent)),
    [conversation?.events]
  );

  const activityLogMenuItem = (
    <EuiContextMenuItem
      key="activity-log"
      icon="timeline"
      disabled={!hasActivity}
      data-test-subj="agentBuilderActivityLogMenuItem"
      onClick={handleOpenActivityLog}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_ACTIVITY_LOG,
        detail: 'conversation',
      })}
    >
      {hasActivity ? (
        labels.activityLog
      ) : (
        <EuiToolTip content={labels.activityLogNoActivityTooltip}>
          <span tabIndex={0}>{labels.activityLog}</span>
        </EuiToolTip>
      )}
    </EuiContextMenuItem>
  );

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
            {labels.genAiSettings}
          </EuiContextMenuItem>,
        ]
      : []),
    ...exportMenuItems,
  ];

  const menuItems = isEmbeddedContext
    ? [activityLogMenuItem, ...embeddedContextMenuItems]
    : [
        activityLogMenuItem,
        <EuiHorizontalRule key="activity-log-divider" margin="none" />,
        ...exportMenuItems,
      ];

  const buttonProps = {
    buttonRef: moreActionsButtonRef,
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
      {isActivityLogOpen && <ActivityLogFlyout onClose={() => setIsActivityLogOpen(false)} />}
      {isTraceFlyoutOpen && (
        <TraceFlyout
          traceId={loadedTraceId}
          initialSpans={loadedSpans ?? undefined}
          onClose={closeTraceFlyout}
        />
      )}
    </>
  );
};
