/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { useAssistantContext } from '../assistant_context';

import * as i18n from './translations';

export interface Props {
  children?: React.ReactNode;
  /** Optionally automatically add this context to a conversation when the assistant is shown */
  conversationId?: string;
  /** Defaults to `discuss`. If null, the button will not have an icon */
  iconType?: string | null;
  /** Optionally specify a well known ID, or default to a UUID */
  promptContextId?: string;
}

const NewChatByIdComponent: React.FC<Props> = ({
  children = i18n.NEW_CHAT,
  conversationId,
  iconType,
  promptContextId,
}) => {
  const { showAssistantOverlay } = useAssistantContext();

  // proxy show / hide calls to assistant context, using our internal prompt context id:
  const showOverlay = useCallback(
    () =>
      showAssistantOverlay({
        conversationId,
        promptContextId,
        showOverlay: true,
      }),
    [conversationId, promptContextId, showAssistantOverlay]
  );

  const icon = useMemo(() => {
    if (iconType === null) {
      return undefined;
    }

    return iconType ?? 'discuss';
  }, [iconType]);

  return useMemo(
    () => (
      <EuiButtonEmpty data-test-subj="newChatById" iconType={icon} onClick={showOverlay}>
        {children}
      </EuiButtonEmpty>
    ),
    [children, icon, showOverlay]
  );
};

NewChatByIdComponent.displayName = 'NewChatByIdComponent';

/**
 * `NewChatByID` displays a _New chat_ icon button by providing only the `promptContextId`
 * of a context that was (already) registered by the `useAssistantOverlay` hook. You may
 * optionally style the button icon, or override the default _New chat_ text with custom
 * content, like {'🪄✨'}
 *
 * USE THIS WHEN: all the data necessary to start a new chat is NOT available
 * in the same part of the React tree as the _New chat_ button. When paired
 * with the `useAssistantOverlay` hook, this option enables context to be be
 * registered where the data is available, and then the _New chat_ button can be displayed
 * in another part of the tree.
 */
export const NewChatById = React.memo(NewChatByIdComponent);
