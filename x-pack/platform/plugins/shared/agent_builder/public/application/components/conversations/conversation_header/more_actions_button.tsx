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
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { useIsAgentReadOnly } from '../../../hooks/agents/use_is_agent_read_only';
import { useNavigation } from '../../../hooks/use_navigation';
import {
  useHasActiveConversation,
  useAgentId,
  useHasPersistedConversation,
} from '../../../hooks/use_conversation';
import { useKibana } from '../../../hooks/use_kibana';
import { searchParamNames } from '../../../search_param_names';
import { appPaths } from '../../../utils/app_paths';
import { DeleteConversationModal } from '../delete_conversation_modal';
import { useHasConnectorsAllPrivileges } from '../../../hooks/use_has_connectors_all_privileges';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { RobotIcon } from '../../common/icons/robot';

const fullscreenLabels = {
  actions: i18n.translate('xpack.agentBuilder.conversationActions.actions', {
    defaultMessage: 'More',
  }),
  actionsAriaLabel: i18n.translate('xpack.agentBuilder.conversationActions.actionsAriaLabel', {
    defaultMessage: 'More',
  }),
  conversationTitleLabel: i18n.translate(
    'xpack.agentBuilder.conversationActions.conversationTitleLabel',
    {
      defaultMessage: 'Conversation',
    }
  ),
  editCurrentAgent: i18n.translate('xpack.agentBuilder.conversationActions.editCurrentAgent', {
    defaultMessage: 'Edit agent',
  }),
  cloneAgentAsNew: i18n.translate('xpack.agentBuilder.conversationActions.duplicateAgentAsNew', {
    defaultMessage: 'Duplicate as new',
  }),
  conversationAgentLabel: i18n.translate(
    'xpack.agentBuilder.conversationActions.conversationAgentLabel',
    {
      defaultMessage: 'Agent',
    }
  ),
  conversationManagementLabel: i18n.translate(
    'xpack.agentBuilder.conversationActions.conversationManagementLabel',
    {
      defaultMessage: 'Management',
    }
  ),
  agents: i18n.translate('xpack.agentBuilder.conversationActions.agents', {
    defaultMessage: 'View all agents',
  }),
  tools: i18n.translate('xpack.agentBuilder.conversationActions.tools', {
    defaultMessage: 'View all tools',
  }),
  rename: i18n.translate('xpack.agentBuilder.conversationActions.rename', {
    defaultMessage: 'Rename',
  }),
  delete: i18n.translate('xpack.agentBuilder.conversationActions.delete', {
    defaultMessage: 'Delete',
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
};

const popoverMinWidthStyles = css`
  min-width: 240px;
`;

const MenuSectionTitle = ({ title }: { title: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle
        size="xxxs"
        css={css`
          padding-left: ${euiTheme.size.s};
        `}
      >
        <h1>{title}</h1>
      </EuiTitle>
      <EuiSpacer size="s" />
    </>
  );
};

interface MoreActionsButtonProps {
  onRenameConversation: () => void;
}

export const MoreActionsButton: React.FC<MoreActionsButtonProps> = ({ onRenameConversation }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const hasActiveConversation = useHasActiveConversation();
  const hasPersistedConversation = useHasPersistedConversation();
  const agentId = useAgentId();
  const isAgentReadOnly = useIsAgentReadOnly(agentId);
  const { createAgentBuilderUrl } = useNavigation();
  const { euiTheme } = useEuiTheme();
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

  const menuItems = [
    ...(hasPersistedConversation
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
              onRenameConversation();
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
    <MenuSectionTitle key="agent-title" title={fullscreenLabels.conversationAgentLabel} />,
    <EuiContextMenuItem
      key="edit-current-agent"
      icon="pencil"
      size="s"
      disabled={isAgentReadOnly || !manageAgents}
      onClick={closePopover}
      href={agentId ? createAgentBuilderUrl(appPaths.agents.edit({ agentId })) : undefined}
    >
      {fullscreenLabels.editCurrentAgent}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="clone-agent"
      icon="copy"
      size="s"
      disabled={!agentId || !manageAgents}
      onClick={closePopover}
      href={
        agentId
          ? createAgentBuilderUrl(appPaths.agents.new, { [searchParamNames.sourceId]: agentId })
          : undefined
      }
    >
      {fullscreenLabels.cloneAgentAsNew}
    </EuiContextMenuItem>,
    <MenuSectionTitle
      key="management-title"
      title={fullscreenLabels.conversationManagementLabel}
    />,
    <EuiContextMenuItem
      key="agents"
      icon={<RobotIcon />}
      onClick={closePopover}
      href={createAgentBuilderUrl(appPaths.agents.list)}
      data-test-subj="agentBuilderActionsAgents"
    >
      {fullscreenLabels.agents}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="tools"
      icon="wrench"
      onClick={closePopover}
      href={createAgentBuilderUrl(appPaths.tools.list)}
      data-test-subj="agentBuilderActionsTools"
    >
      {fullscreenLabels.tools}
    </EuiContextMenuItem>,
    ...(hasAccessToGenAiSettings
      ? [
          <EuiContextMenuItem
            key="agentBuilderSettings"
            icon="gear"
            onClick={closePopover}
            href={application.getUrlForApp('management', { path: '/ai/genAiSettings' })}
            data-test-subj="agentBuilderGenAiSettingsButton"
          >
            {fullscreenLabels.genAiSettings}
          </EuiContextMenuItem>,
        ]
      : []),
  ];

  const buttonProps = {
    iconType: 'boxesVertical' as const,
    color: 'text' as const,
    'aria-label': fullscreenLabels.actionsAriaLabel,
    onClick: togglePopover,
    'data-test-subj': 'agentBuilderMoreActionsButton',
  };
  const showButtonIcon = hasActiveConversation;
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
        panelPaddingSize="xs"
        anchorPosition="downCenter"
        panelProps={{
          css: popoverMinWidthStyles,
        }}
      >
        <EuiContextMenuPanel size="s" items={menuItems} />
        <EuiSpacer size="s" />
      </EuiPopover>
      <DeleteConversationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
};
