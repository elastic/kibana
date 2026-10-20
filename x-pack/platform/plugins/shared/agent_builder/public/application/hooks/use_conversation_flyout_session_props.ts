/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { useConversationContext } from '../context/conversation/conversation_context';

export type ConversationFlyoutSessionProps = Pick<
  EuiFlyoutProps,
  'session' | 'historyKey' | 'outsideClickCloses' | 'flyoutMenuProps'
>;

/**
 * EUI flyout props that stack full-screen conversation flyouts in one shared session history.
 * `title` must stay the same while the flyout is open: EUI closes the whole stack when it changes.
 */
export const useConversationFlyoutSessionProps = (
  title: string
): ConversationFlyoutSessionProps => {
  const { isEmbeddedContext } = useConversationContext();

  return useMemo<ConversationFlyoutSessionProps>(
    () =>
      isEmbeddedContext
        ? {}
        : {
            session: 'start',
            historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
            outsideClickCloses: false,
            flyoutMenuProps: { title },
          },
    [isEmbeddedContext, title]
  );
};
