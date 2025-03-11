/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useFetchCurrentUserConversations } from '../assistant/api';
import { useAssistantContext } from '../assistant_context';
import * as i18n from './translations';

interface Props {
  id?: string;
}

export const Conversations: React.FC<Props> = ({ id }) => {
  const { euiTheme } = useEuiTheme();
  const {
    http,
    assistantAvailability: { isAssistantEnabled },
    showAssistantOverlay,
  } = useAssistantContext();
  const { data: conversations, isFetched: conversationsLoaded } = useFetchCurrentUserConversations({
    http,
    isAssistantEnabled,
    filter: `messages:{ content : "${id}" }`,
  });
  const conversationCount = useMemo(() => Object.keys(conversations).length, [conversations]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onSelectConversation = useCallback(
    (conversationId: string) => {
      closePopover();
      showAssistantOverlay({ showOverlay: true, selectedConversation: { id: conversationId } });
    },
    [closePopover, showAssistantOverlay]
  );

  return (
    <>
      <EuiTitle size={'s'}>
        <h2>{i18n.AI_ASSISTANT}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel paddingSize="s" color="subdued" hasBorder={true}>
        {conversationsLoaded ? (
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <p>{i18n.YOUR_CONVERSATIONS}</p>
                  </EuiText>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color="hollow"
                    css={css`
                      color: ${euiTheme.colors.textPrimary};
                    `}
                  >
                    {conversationCount}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {conversationCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={
                    <EuiButtonEmpty iconSide="right" iconType="arrowDown" onClick={togglePopover}>
                      {i18n.VIEW}
                    </EuiButtonEmpty>
                  }
                  isOpen={isPopoverOpen}
                  closePopover={closePopover}
                  anchorPosition="downRight"
                >
                  <EuiContextMenuPanel>
                    {Object.values(conversations).map((conversation) => (
                      <EuiContextMenuItem
                        key={conversation.id}
                        onClick={() => onSelectConversation(conversation.id)}
                      >
                        {conversation.title}
                      </EuiContextMenuItem>
                    ))}
                  </EuiContextMenuPanel>
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          <EuiSkeletonText lines={1} size="xs" />
        )}
      </EuiPanel>
    </>
  );
};
