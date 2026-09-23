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
import { useAgentId } from '../../../hooks/use_conversation';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useKibana } from '../../../hooks/use_kibana';
import { appPaths } from '../../../utils/app_paths';
import { useHasConnectorsAllPrivileges } from '../../../hooks/use_has_connectors_all_privileges';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';

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

  const {
    services: { application },
  } = useKibana();
  const hasAccessToGenAiSettings = useHasConnectorsAllPrivileges();

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
  ];

  const fullscreenMenuItems = [
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
  ];

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
    </>
  );
};
