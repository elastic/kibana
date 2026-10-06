/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { htmlIdGenerator } from '@elastic/eui';
import type { EuiFlyoutMenuAction } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import type { ConversationsService } from '../services/conversations/conversations_service';
import type { ConversationTemplatesService } from '../services/conversation_templates';
import { ConversationDetailsFlyoutSnapshot, FLYOUT_TITLE } from './conversation_details_flyout';
import { flyoutMenuRowStyles } from './flyout_menu_row_styles';

const generateTitleId = htmlIdGenerator('agentBuilderConversationDetailsFlyoutTitle');

export interface OpenConversationDetailsFlyoutOptions {
  core: CoreStart;
  conversationsService: ConversationsService;
  conversationTemplatesService: ConversationTemplatesService;
  conversationId: string;
  onClose?: () => void;
  trailingActions?: EuiFlyoutMenuAction[];
}

export const openConversationDetailsFlyout = async ({
  core,
  conversationsService,
  conversationTemplatesService,
  conversationId,
  onClose,
  trailingActions,
}: OpenConversationDetailsFlyoutOptions): Promise<() => void> => {
  const titleId = generateTitleId();
  const queryClient = new QueryClient();

  const flyoutRef = core.overlays.openSystemFlyout(
    <QueryClientProvider client={queryClient}>
      <ConversationDetailsFlyoutSnapshot
        conversationId={conversationId}
        conversationsService={conversationsService}
        conversationTemplatesService={conversationTemplatesService}
        titleId={titleId}
      />
    </QueryClientProvider>,
    {
      session: 'start',
      historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
      title: FLYOUT_TITLE,
      size: 's',
      flyoutMenuDisplayMode: 'always',
      flyoutMenuProps: { trailingActions },
      type: 'push',
      paddingSize: 'm',
      css: flyoutMenuRowStyles,
      role: 'region',
      'data-test-subj': 'agentBuilderConversationDetailsFlyout-snapshot',
      'aria-labelledby': titleId,
    }
  );

  flyoutRef.onClose.then(() => {
    onClose?.();
  });

  return () => flyoutRef.close();
};
