/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiPopover, EuiButtonIcon, EuiContextMenuPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useNavigation } from '../../../../hooks/use_navigation';
import { useAgentId } from '../../../../hooks/use_conversation';
import { appPaths } from '../../../../utils/app_paths';
import { ExternalLinkMenuItem } from './external_link_menu_item';

export const EmbeddedActionsRight: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const agentId = useAgentId();
  const { createOnechatUrl } = useNavigation();

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const menuItems = [
    <EuiContextMenuItem
      key="openInAgentBuilder"
      icon="gear"
      size="s"
      href={agentId ? createOnechatUrl(appPaths.agents.edit({ agentId })) : undefined}
      onClick={closePopover}
    >
      {i18n.translate('xpack.onechat.embedded.conversationActions.openInAgentBuilder', {
        defaultMessage: 'Open in Agent Builder',
      })}
    </EuiContextMenuItem>,
    ...(agentId
      ? [
          <ExternalLinkMenuItem
            key="agentSettings"
            icon="gear"
            href={createOnechatUrl(appPaths.agents.edit({ agentId }))}
            onClose={closePopover}
            label={i18n.translate('xpack.onechat.embedded.conversationActions.agentSettings', {
              defaultMessage: 'Agent Settings',
            })}
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
            aria-label={i18n.translate('xpack.onechat.conversationActions.ellipsis', {
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
        aria-label={i18n.translate('xpack.onechat.conversationActions.closeConversation', {
          defaultMessage: 'Close conversation',
        })}
        onClick={onClose}
        data-test-subj="onechatEmbeddedCloseConversationButton"
      />
    </>
  );
};
