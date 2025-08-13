/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiCallOut, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { DataStreamApis } from '../use_data_stream_apis';
import {
  DUPLICATE,
  DUPLICATE_ERROR,
  DUPLICATE_SUCCESS,
} from '../settings/settings_context_menu/translations';
import { Conversation, useAssistantContext } from '../../..';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  SHARED_CONVERSATION_CALLOUT,
} from '../../assistant_context/constants';
import * as i18n from './translations';
import { useConversation } from '../use_conversation';

interface Props {
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  selectedConversation?: Conversation;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation | undefined>>;
}

const SharedConversationCalloutComponent: React.FC<Props> = ({
  refetchCurrentUserConversations,
  selectedConversation,
  setCurrentConversation,
}) => {
  const { euiTheme } = useEuiTheme();
  const localStorageId = `${DEFAULT_ASSISTANT_NAMESPACE}.${SHARED_CONVERSATION_CALLOUT}.${selectedConversation?.id}`;
  const [localStorageShowConversation, setLocalStorageShowConversation] = useLocalStorage<boolean>(
    localStorageId,
    true
  );
  const onDismiss = useCallback(() => {
    setLocalStorageShowConversation(false);
  }, [setLocalStorageShowConversation]);

  const { toasts } = useAssistantContext();
  const { createConversation } = useConversation();
  const handleDuplicateConversation = useCallback(async () => {
    try {
      if (!selectedConversation || selectedConversation.id === '') {
        throw new Error('No conversation available to duplicate');
      }
      const newConversation = await createConversation({
        title: `[${DUPLICATE}] ${selectedConversation.title}`,
        apiConfig: selectedConversation.apiConfig,
        messages: selectedConversation.messages,
        replacements: selectedConversation.replacements,
      });
      if (newConversation) {
        await refetchCurrentUserConversations();
        setCurrentConversation(newConversation);
        toasts?.addSuccess({
          title: DUPLICATE_SUCCESS(newConversation.title),
        });
      } else {
        throw new Error('Failed to duplicate conversation');
      }
    } catch (error) {
      toasts?.addError(error, {
        title: DUPLICATE_ERROR,
      });
    }
  }, [
    createConversation,
    refetchCurrentUserConversations,
    selectedConversation,
    setCurrentConversation,
    toasts,
  ]);

  return localStorageShowConversation ? (
    <EuiCallOut
      css={css`
        margin: ${euiTheme.size.m};
        padding: ${euiTheme.size.m};
      `}
      size="s"
      title={i18n.CONVERSATION_SHARED_TITLE}
      iconType="users"
      onDismiss={onDismiss}
    >
      {i18n.DISABLED_OWNERSHIP}
      <br />
      <br />
      <EuiButton
        onClick={handleDuplicateConversation}
        iconType="copy"
        color="primary"
        fill
        size="s"
      >
        {DUPLICATE}
      </EuiButton>
    </EuiCallOut>
  ) : null;
};

SharedConversationCalloutComponent.displayName = 'SharedConversationCalloutComponent';

export const SharedConversationCallout = React.memo(SharedConversationCalloutComponent);
