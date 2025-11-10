/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useAgentId } from '../../../hooks/use_conversation';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

const EmbeddedRightActions: React.FC<ConversationRightActionsProps> = ({ onClose }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const agentId = useAgentId();
  const { navigateToOnechatUrl, createOnechatUrl } = useNavigation();

  const menuItems = [
    <EuiContextMenuItem
      key="openInAgentBuilder"
      icon="gear"
      size="s"
      onClick={() => {
        setIsPopoverOpen(false);
        if (agentId) {
          navigateToOnechatUrl(appPaths.agents.edit({ agentId }));
        }
      }}
    >
      {i18n.translate('xpack.onechat.embedded.conversationActions.openInAgentBuilder', {
        defaultMessage: 'Open in Agent Builder',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="agentSettings"
      icon="gear"
      size="s"
      href={agentId ? createOnechatUrl(appPaths.agents.edit({ agentId })) : undefined}
      target="_blank"
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.onechat.embedded.conversationActions.agentSettings', {
            defaultMessage: 'Agent Settings',
          })}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="popout" size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiContextMenuItem>,
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
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
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

const FullScreenRightActions: React.FC<ConversationRightActionsProps> = ({ onClose }) => {
  return <div>FullScreenRightActions</div>;
};

interface ConversationRightActionsProps {
  onClose?: () => void;
}

export const ConversationRightActions: React.FC<ConversationRightActionsProps> = ({ onClose }) => {
  const { euiTheme } = useEuiTheme();
  const { isEmbeddedContext } = useConversationContext();

  const actionsContainerStyles = css`
    display: flex;
    flex-direction: row;
    gap: ${euiTheme.size.s};
    align-items: center;
    justify-self: end;
  `;

  const labels = {
    container: i18n.translate('xpack.onechat.conversationActions.container', {
      defaultMessage: 'Conversation actions',
    }),
  };

  return (
    <div css={actionsContainerStyles} aria-label={labels.container}>
      {isEmbeddedContext ? <EmbeddedRightActions onClose={onClose} /> : <FullScreenRightActions />}
    </div>
  );
};
