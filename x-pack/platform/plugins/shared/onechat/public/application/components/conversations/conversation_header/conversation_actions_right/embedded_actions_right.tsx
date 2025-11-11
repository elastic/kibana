/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiPopover, EuiButtonIcon, EuiContextMenuPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useIsAgentReadOnly } from '../../../../hooks/agents/use_is_agent_read_only';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { useNavigation } from '../../../../hooks/use_navigation';
import { useAgentId } from '../../../../hooks/use_conversation';
import { useKibana } from '../../../../hooks/use_kibana';
import { appPaths } from '../../../../utils/app_paths';
import { ExternalLinkMenuItem } from './external_link_menu_item';

export const EmbeddedActionsRight: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const agentId = useAgentId();
  const { createOnechatUrl } = useNavigation();
  const {
    services: { application },
  } = useKibana();
  const conversationId = useConversationId();
  const isAgentReadOnly = useIsAgentReadOnly(agentId);

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleOpenInAgentBuilder = () => {
    closePopover();
    onClose?.();
  };

  const menuItems = [
    <EuiContextMenuItem
      key="openInAgentBuilder"
      icon="fullScreen"
      size="s"
      href={
        conversationId
          ? createOnechatUrl(appPaths.chat.conversation({ conversationId }))
          : createOnechatUrl(appPaths.chat.new)
      }
      onClick={handleOpenInAgentBuilder}
    >
      {i18n.translate('xpack.onechat.embedded.conversationActions.openInAgentBuilder', {
        defaultMessage: 'Open in Agent Builder',
      })}
    </EuiContextMenuItem>,
    ...(agentId
      ? [
          <ExternalLinkMenuItem
            key="agentBuilderSettings"
            icon="gear"
            disabled={isAgentReadOnly}
            href={application.getUrlForApp('management', { path: '/ai/agentBuilder' })}
            onClose={closePopover}
            label={i18n.translate(
              'xpack.onechat.embedded.conversationActions.agentBuilderSettings',
              {
                defaultMessage: 'Settings',
              }
            )}
          />,
        ]
      : []),
  ];

  return (
    <>
      <EuiPopover
        button={
          <EuiButtonIcon
            color="text"
            iconType="boxesVertical"
            aria-label={i18n.translate('xpack.onechat.embedded.conversationActions.ellipsis', {
              defaultMessage: 'Ellipsis',
            })}
            onClick={togglePopover}
            data-test-subj="onechatEmbeddedEllipsisButton"
          />
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="s"
        anchorPosition="downRight"
      >
        <EuiContextMenuPanel size="s" items={menuItems} />
      </EuiPopover>
      <EuiButtonIcon
        color="text"
        iconType="cross"
        aria-label={i18n.translate('xpack.onechat.embedded.conversationActions.closeConversation', {
          defaultMessage: 'Close conversation',
        })}
        onClick={onClose}
        data-test-subj="onechatEmbeddedCloseConversationButton"
      />
    </>
  );
};
