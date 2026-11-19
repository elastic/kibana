/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getFlyoutManagerStore, htmlIdGenerator } from '@elastic/eui';
import type { EuiFlyoutMenuAction } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import type { ConversationsService } from '../services/conversations/conversations_service';
import type { ConversationTemplatesService } from '../services/conversation_templates';
import { ConversationDetailsFlyoutSnapshot, FLYOUT_TITLE } from './conversation_details_flyout';
import {
  CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH,
  getConversationDetailsFlyoutWidthProps,
} from './conversation_details_flyout_width';

const notFoundMessage = (conversationId: string) =>
  i18n.translate('xpack.agentBuilder.conversationDetailsFlyout.notFoundToast', {
    defaultMessage:
      'Conversation with id {conversationId} does not exist. Try with an existing conversation id.',
    values: { conversationId },
  });

const generateTitleId = htmlIdGenerator('agentBuilderConversationDetailsFlyoutTitle');
const generateFlyoutId = htmlIdGenerator('agentBuilderConversationDetailsFlyout');

/**
 * Drops the flyouts stacked on this one in its history group, bringing it back to the front (same
 * as picking it in the flyout Back history). EUI closes only a flyout's own session when it is not
 * the current one, which would leave the stacked flyouts open with nothing to go back to.
 */
const surfaceOwnSession = (flyoutId: string): void => {
  const store = getFlyoutManagerStore();
  const { sessions } = store.getState();
  const ownIndex = sessions.findIndex(({ mainFlyoutId }) => mainFlyoutId === flyoutId);
  if (ownIndex === -1) {
    return;
  }
  const hasNewerSessionInGroup = sessions
    .slice(ownIndex + 1)
    .some(({ historyKey }) => historyKey === CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY);
  if (hasNewerSessionInGroup) {
    store.goToFlyout(flyoutId, 'main');
  }
};

export interface OpenConversationDetailsFlyoutOptions {
  core: CoreStart;
  conversationsService: ConversationsService;
  conversationTemplatesService: ConversationTemplatesService;
  conversationId: string;
  onClose?: () => void;
  onConversationUpdated?: () => void;
  trailingActions?: EuiFlyoutMenuAction[];
}

export const openConversationDetailsFlyout = async ({
  core,
  conversationsService,
  conversationTemplatesService,
  conversationId,
  onClose,
  onConversationUpdated,
  trailingActions,
}: OpenConversationDetailsFlyoutOptions): Promise<() => void> => {
  const titleId = generateTitleId();
  const flyoutId = generateFlyoutId();
  const queryClient = new QueryClient();

  const onNotFound = () => {
    flyoutRef.close();
    core.notifications.toasts.addDanger(notFoundMessage(conversationId));
  };

  const flyoutRef = core.overlays.openSystemFlyout(
    <QueryClientProvider client={queryClient}>
      <ConversationDetailsFlyoutSnapshot
        conversationId={conversationId}
        conversationsService={conversationsService}
        conversationTemplatesService={conversationTemplatesService}
        titleId={titleId}
        onNotFound={onNotFound}
        onConversationUpdated={onConversationUpdated}
      />
    </QueryClientProvider>,
    {
      id: flyoutId,
      session: 'start',
      historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
      title: FLYOUT_TITLE,
      ...getConversationDetailsFlyoutWidthProps(),
      // Lets the flyout menu's reset action return to the default, not to the remembered width.
      defaultSize: CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH,
      flyoutMenuDisplayMode: 'always',
      flyoutMenuProps: { trailingActions },
      type: 'push',
      paddingSize: 'm',
      role: 'region',
      'data-test-subj': 'agentBuilderConversationDetailsFlyout-snapshot',
      'aria-labelledby': titleId,
    }
  );

  flyoutRef.onClose.then(() => {
    onClose?.();
  });

  return () => {
    surfaceOwnSession(flyoutId);
    flyoutRef.close();
  };
};
