/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFormRow, EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';
import { css } from '@emotion/react';

import { useAssistantContext } from '../../assistant_context';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

interface Props {
  conversationId?: string;
  onSelectionChange?: (value: string) => void;
  shouldDisableKeyboardShortcut?: () => boolean;
  isDisabled?: boolean;
}

const getPreviousConversationId = (conversationIds: string[], selectedConversationId: string) => {
  return conversationIds.indexOf(selectedConversationId) === 0
    ? conversationIds[conversationIds.length - 1]
    : conversationIds[conversationIds.indexOf(selectedConversationId) - 1];
};

function getNextConversationId(conversationIds: string[], selectedConversationId: string) {
  return conversationIds.indexOf(selectedConversationId) + 1 >= conversationIds.length
    ? conversationIds[0]
    : conversationIds[conversationIds.indexOf(selectedConversationId) + 1];
}

export const ConversationSelector: React.FC<Props> = React.memo(
  ({
    conversationId = 'default',
    onSelectionChange,
    shouldDisableKeyboardShortcut = () => false,
    isDisabled = false,
  }) => {
    const [selectedConversationId, setSelectedConversationId] = useState<string>(conversationId);

    const { conversations } = useAssistantContext();
    const conversationIds = useMemo(() => Object.keys(conversations), [conversations]);
    const conversationOptions = conversationIds.map((id) => ({ value: id, inputDisplay: id }));

    const onChange = useCallback((value: string) => {
      setSelectedConversationId(value ?? 'default');
    }, []);
    const onLeftArrowClick = useCallback(() => {
      const prevId = getPreviousConversationId(conversationIds, selectedConversationId);
      setSelectedConversationId(prevId);
    }, [conversationIds, selectedConversationId]);
    const onRightArrowClick = useCallback(() => {
      const nextId = getNextConversationId(conversationIds, selectedConversationId);
      setSelectedConversationId(nextId);
    }, [conversationIds, selectedConversationId]);

    // Register keyboard listener for quick conversation switching
    const onKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (isDisabled || conversationIds.length <= 1) {
          return;
        }

        if (
          event.key === 'ArrowLeft' &&
          (isMac ? event.metaKey : event.ctrlKey) &&
          !shouldDisableKeyboardShortcut()
        ) {
          event.preventDefault();
          onLeftArrowClick();
        }
        if (
          event.key === 'ArrowRight' &&
          (isMac ? event.metaKey : event.ctrlKey) &&
          !shouldDisableKeyboardShortcut()
        ) {
          event.preventDefault();
          onRightArrowClick();
        }
      },
      [
        conversationIds.length,
        isDisabled,
        onLeftArrowClick,
        onRightArrowClick,
        shouldDisableKeyboardShortcut,
      ]
    );
    useEvent('keydown', onKeyDown);

    useEffect(() => {
      onSelectionChange?.(selectedConversationId);
    }, [onSelectionChange, selectedConversationId]);

    return (
      <EuiFormRow
        label="Selected Conversation"
        display="rowCompressed"
        css={css`
          min-width: 300px;
          margin-top: -6px;
        `}
      >
        <EuiSuperSelect
          options={conversationOptions}
          valueOfSelected={selectedConversationId}
          onChange={onChange}
          compressed={true}
          disabled={isDisabled}
          aria-label="Conversation Selector"
          prepend={
            <EuiToolTip content="Previous Conversation (⌘ + ←)" display="block">
              <EuiButtonIcon
                iconType="arrowLeft"
                aria-label="Previous Conversation"
                onClick={onLeftArrowClick}
                disabled={isDisabled || conversationIds.length <= 1}
              />
            </EuiToolTip>
          }
          append={
            <EuiToolTip content="Next Conversation (⌘ + →)" display="block">
              <EuiButtonIcon
                iconType="arrowRight"
                aria-label="Next Conversation"
                onClick={onRightArrowClick}
                disabled={isDisabled || conversationIds.length <= 1}
              />
            </EuiToolTip>
          }
        />
      </EuiFormRow>
    );
  }
);

ConversationSelector.displayName = 'ConversationSelector';
