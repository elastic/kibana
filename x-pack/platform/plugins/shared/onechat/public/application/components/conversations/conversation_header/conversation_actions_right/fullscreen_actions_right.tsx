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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useIsAgentReadOnly } from '../../../../hooks/agents/use_is_agent_read_only';
import { useNavigation } from '../../../../hooks/use_navigation';
import { useHasActiveConversation, useAgentId } from '../../../../hooks/use_conversation';
import { searchParamNames } from '../../../../search_param_names';
import { appPaths } from '../../../../utils/app_paths';
import { ExternalLinkMenuItem } from './external_link_menu_item';

const fullscreenLabels = {
  actions: i18n.translate('xpack.onechat.conversationActions.actions', {
    defaultMessage: 'Actions',
  }),
  actionsAriaLabel: i18n.translate('xpack.onechat.conversationActions.actionsAriaLabel', {
    defaultMessage: 'Actions',
  }),
  edit: i18n.translate('xpack.onechat.conversationActions.edit', {
    defaultMessage: 'Edit',
  }),
  editCurrentAgent: i18n.translate('xpack.onechat.conversationActions.editCurrentAgent', {
    defaultMessage: 'Edit current agent',
  }),
  cloneAgentAsNew: i18n.translate('xpack.onechat.conversationActions.cloneAgentAsNew', {
    defaultMessage: 'Clone agent as new',
  }),
  manage: i18n.translate('xpack.onechat.conversationActions.manage', {
    defaultMessage: 'Manage',
  }),
  agents: i18n.translate('xpack.onechat.conversationActions.agents', {
    defaultMessage: 'Agents',
  }),
  tools: i18n.translate('xpack.onechat.conversationActions.tools', {
    defaultMessage: 'Tools',
  }),
};

const renderMenuSectionTitle = (title: string) => {
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

export const FullScreenActionsRight: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const hasActiveConversation = useHasActiveConversation();
  const agentId = useAgentId();
  const isAgentReadOnly = useIsAgentReadOnly(agentId);
  const { createOnechatUrl } = useNavigation();

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const menuItems = [
    renderMenuSectionTitle(fullscreenLabels.edit),
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
    ...(agentId
      ? [
          <EuiContextMenuItem
            key="clone-agent"
            icon="copy"
            size="s"
            onClick={closePopover}
            href={createOnechatUrl(appPaths.agents.new, { [searchParamNames.sourceId]: agentId })}
          >
            {fullscreenLabels.cloneAgentAsNew}
          </EuiContextMenuItem>,
        ]
      : []),
    renderMenuSectionTitle(fullscreenLabels.manage),
    <ExternalLinkMenuItem
      key="agents"
      icon="machineLearningApp"
      onClose={closePopover}
      href={createOnechatUrl(appPaths.agents.list)}
      label={fullscreenLabels.agents}
      dataTestSubj="onechatActionsAgents"
    />,
    <ExternalLinkMenuItem
      key="tools"
      icon="grid"
      onClose={closePopover}
      href={createOnechatUrl(appPaths.tools.list)}
      label={fullscreenLabels.tools}
      dataTestSubj="onechatActionsTools"
    />,
  ];

  const buttonProps = {
    iconType: 'gear' as const,
    color: 'text' as const,
    'aria-label': fullscreenLabels.actionsAriaLabel,
    onClick: togglePopover,
    'data-test-subj': 'onechatFullScreenActionsButton',
  };
  const button = hasActiveConversation ? (
    <EuiButtonIcon {...buttonProps} />
  ) : (
    <EuiButtonEmpty {...buttonProps}>{fullscreenLabels.actions}</EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      anchorPosition="downCenter"
    >
      <EuiContextMenuPanel size="s" items={menuItems} />
    </EuiPopover>
  );
};
