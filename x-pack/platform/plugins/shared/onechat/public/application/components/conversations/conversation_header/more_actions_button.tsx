/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiContextMenuItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiPopover,
  EuiContextMenuPanel,
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { useIsAgentReadOnly } from '../../../hooks/agents/use_is_agent_read_only';
import { useNavigation } from '../../../hooks/use_navigation';
import { useHasActiveConversation, useAgentId } from '../../../hooks/use_conversation';
import { useKibana } from '../../../hooks/use_kibana';
import { searchParamNames } from '../../../search_param_names';
import { appPaths } from '../../../utils/app_paths';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { DeleteConversationModal } from './delete_conversation_modal';
import { RenameConversationModal } from './rename_conversation_modal';

const fullscreenLabels = {
  actions: i18n.translate('xpack.onechat.conversationActions.actions', {
    defaultMessage: 'More',
  }),
  actionsAriaLabel: i18n.translate('xpack.onechat.conversationActions.actionsAriaLabel', {
    defaultMessage: 'More',
  }),
  conversationTitleLabel: i18n.translate(
    'xpack.onechat.conversationActions.conversationTitleLabel',
    {
      defaultMessage: 'CONVERSATION',
    }
  ),
  editCurrentAgent: i18n.translate('xpack.onechat.conversationActions.editCurrentAgent', {
    defaultMessage: 'Edit agent',
  }),
  cloneAgentAsNew: i18n.translate('xpack.onechat.conversationActions.duplicateAgentAsNew', {
    defaultMessage: 'Duplicate as new',
  }),
  conversationAgentLabel: i18n.translate(
    'xpack.onechat.conversationActions.conversationAgentLabel',
    {
      defaultMessage: 'AGENT',
    }
  ),
  conversationManagementLabel: i18n.translate(
    'xpack.onechat.conversationActions.conversationManagementLabel',
    {
      defaultMessage: 'MANAGEMENT',
    }
  ),
  agents: i18n.translate('xpack.onechat.conversationActions.agents', {
    defaultMessage: 'View all agents',
  }),
  tools: i18n.translate('xpack.onechat.conversationActions.tools', {
    defaultMessage: 'View all tools',
  }),
  rename: i18n.translate('xpack.onechat.conversationTitle.rename', {
    defaultMessage: 'Rename',
  }),
  delete: i18n.translate('xpack.onechat.conversationTitle.delete', {
    defaultMessage: 'Delete',
  }),
  agentBuilderSettings: i18n.translate('xpack.onechat.conversationActions.agentBuilderSettings', {
    defaultMessage: 'Gen AI Settings',
  }),
};

const popoverMinWidthStyles = css`
  min-width: 240px;
`;

const MenuSectionTitle = ({ title }: { title: string }) => {
  return (
    <>
      <EuiSpacer size="xs" />
      <EuiTitle size="xxxs">
        <h1>{title}</h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" />
    </>
  );
};

export const MoreActionsButton: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const hasActiveConversation = useHasActiveConversation();
  const agentId = useAgentId();
  const { isEmbeddedContext } = useConversationContext();
  const isAgentReadOnly = useIsAgentReadOnly(agentId);
  const { createOnechatUrl } = useNavigation();
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana();

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const menuItems = [
    ...(hasActiveConversation
      ? [
          <MenuSectionTitle
            key="conversation-title"
            title={fullscreenLabels.conversationTitleLabel}
          />,
          <EuiContextMenuItem
            key="rename"
            icon="pencil"
            size="s"
            data-test-subj="agentBuilderConversationRenameButton"
            onClick={() => {
              closePopover();
              setIsRenameModalOpen(true);
            }}
          >
            {fullscreenLabels.rename}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            size="s"
            css={css`
              color: ${euiTheme.colors.textDanger};
            `}
            data-test-subj="agentBuilderConversationDeleteButton"
            onClick={() => {
              closePopover();
              setIsDeleteModalOpen(true);
            }}
          >
            {fullscreenLabels.delete}
          </EuiContextMenuItem>,
        ]
      : []),
    <MenuSectionTitle title={fullscreenLabels.conversationAgentLabel} />,
    <EuiContextMenuItem
      key="edit-current-agent"
      icon="pencil"
      size="s"
      disabled={isAgentReadOnly}
      onClick={closePopover}
      href={agentId ? createOnechatUrl(appPaths.agents.edit({ agentId })) : undefined}
    >
      {fullscreenLabels.editCurrentAgent}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="clone-agent"
      icon="copy"
      size="s"
      disabled={!agentId}
      onClick={closePopover}
      href={
        agentId
          ? createOnechatUrl(appPaths.agents.new, { [searchParamNames.sourceId]: agentId })
          : undefined
      }
    >
      {fullscreenLabels.cloneAgentAsNew}
    </EuiContextMenuItem>,
    <MenuSectionTitle title={fullscreenLabels.conversationManagementLabel} />,
    <EuiContextMenuItem
      key="agents"
      icon="machineLearningApp"
      size="s"
      onClick={closePopover}
      href={createOnechatUrl(appPaths.agents.list)}
      data-test-subj="onechatActionsAgents"
    >
      {fullscreenLabels.agents}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="tools"
      icon="wrench"
      size="s"
      onClick={closePopover}
      href={createOnechatUrl(appPaths.tools.list)}
      data-test-subj="onechatActionsTools"
    >
      {fullscreenLabels.tools}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="agentBuilderSettings"
      icon="gear"
      size="s"
      onClick={closePopover}
      href={application.getUrlForApp('management', { path: '/ai/agentBuilder' })}
      data-test-subj="onechatActionsAgentBuilderSettings"
    >
      {fullscreenLabels.agentBuilderSettings}
    </EuiContextMenuItem>,
  ];

  const buttonProps = {
    iconType: 'boxesVertical' as const,
    color: 'text' as const,
    'aria-label': fullscreenLabels.actionsAriaLabel,
    onClick: togglePopover,
    'data-test-subj': 'onechatFullScreenActionsButton',
  };
  const showButtonIcon = isEmbeddedContext || hasActiveConversation;
  const button = showButtonIcon ? (
    <EuiButtonIcon {...buttonProps} />
  ) : (
    <EuiButtonEmpty {...buttonProps}>{fullscreenLabels.actions}</EuiButtonEmpty>
  );

  return (
    <>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="s"
        anchorPosition="upRight"
        panelProps={{
          css: popoverMinWidthStyles,
        }}
      >
        <EuiContextMenuPanel size="s" items={menuItems} />
      </EuiPopover>
      <DeleteConversationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
      <RenameConversationModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
      />
    </>
  );
};
