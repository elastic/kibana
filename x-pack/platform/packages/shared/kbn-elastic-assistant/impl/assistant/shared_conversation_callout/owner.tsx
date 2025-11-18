/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiCallOut, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { ConversationSharedState } from '@kbn/elastic-assistant-common';
import { getSharedIcon } from '../share_conversation/utils';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  SHARED_CONVERSATION_CALLOUT,
} from '../../assistant_context/constants';
import * as i18n from './translations';

/**
 * Renders a chat window with a prompt input and a chat history, along with
 * quick prompts for common actions, settings, and prompt context providers.
 */
const SharedConversationOwnerCalloutComponent: React.FC<{
  id: string;
  isGloballyShared: boolean;
}> = ({ id, isGloballyShared }) => {
  const { euiTheme } = useEuiTheme();
  const localStorageId = `${DEFAULT_ASSISTANT_NAMESPACE}.${SHARED_CONVERSATION_CALLOUT}.owner.${id}`;
  const [localStorageShowConversation, setLocalStorageShowConversation] = useLocalStorage<boolean>(
    localStorageId,
    true
  );
  const onDismiss = useCallback(() => {
    setLocalStorageShowConversation(false);
  }, [setLocalStorageShowConversation]);
  const { icon, description, title } = useMemo(
    () =>
      isGloballyShared
        ? {
            icon: getSharedIcon(ConversationSharedState.SHARED),
            title: i18n.CONVERSATION_SHARED_TITLE,
            description: i18n.OWNERSHIP_CALLOUT,
          }
        : {
            icon: getSharedIcon(ConversationSharedState.RESTRICTED),
            title: i18n.CONVERSATION_RESTRICTED_TITLE,
            description: i18n.OWNERSHIP_CALLOUT_RESTRICTED,
          },
    [isGloballyShared]
  );
  return localStorageShowConversation ? (
    <EuiCallOut
      announceOnMount={false}
      data-test-subj="ownerSharedConversationCallout"
      css={css`
        margin: ${euiTheme.size.m};
        padding: ${euiTheme.size.m};
      `}
      size="s"
      title={title}
      iconType={icon}
      onDismiss={onDismiss}
    >
      {description}
    </EuiCallOut>
  ) : null;
};

SharedConversationOwnerCalloutComponent.displayName = 'SharedConversationOwnerCalloutComponent';

export const SharedConversationOwnerCallout = React.memo(SharedConversationOwnerCalloutComponent);
