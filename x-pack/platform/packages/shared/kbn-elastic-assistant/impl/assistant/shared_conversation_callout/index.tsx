/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton, EuiCallOut, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { getConversationSharedState } from '@kbn/elastic-assistant-common';
import { getSharedIcon } from '../share_conversation/utils';
import { DUPLICATE } from '../use_conversation/translations';
import type { DataStreamApis } from '../use_data_stream_apis';
import type { Conversation } from '../../..';
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

  const { duplicateConversation } = useConversation();
  const handleDuplicateConversation = useCallback(
    () =>
      duplicateConversation({
        refetchCurrentUserConversations,
        selectedConversation,
        setCurrentConversation,
      }),
    [
      duplicateConversation,
      refetchCurrentUserConversations,
      selectedConversation,
      setCurrentConversation,
    ]
  );
  const sharedIcon = useMemo(
    () => getSharedIcon(getConversationSharedState(selectedConversation)),
    [selectedConversation]
  );
  return localStorageShowConversation && selectedConversation ? (
    <EuiCallOut
      announceOnMount={false}
      data-test-subj="sharedConversationCallout"
      css={css`
        margin: ${euiTheme.size.m};
        padding: ${euiTheme.size.m};
      `}
      size="s"
      title={i18n.CONVERSATION_SHARED_TITLE}
      iconType={sharedIcon}
      onDismiss={onDismiss}
    >
      {i18n.DISABLED_OWNERSHIP}
      <br />
      <br />
      <EuiButton
        data-test-subj="duplicateConversation"
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
