/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { htmlIdGenerator } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { ConversationsService } from '../services/conversations/conversations_service';
import type { ConversationTemplatesService } from '../services/conversation_templates';
import { ConversationDetailsFlyoutSnapshot, FLYOUT_TITLE } from './conversation_details_flyout';

const generateTitleId = htmlIdGenerator('agentBuilderConversationDetailsFlyoutTitle');

export interface OpenConversationDetailsFlyoutOptions {
  core: CoreStart;
  conversationsService: ConversationsService;
  conversationTemplatesService: ConversationTemplatesService;
  conversationId: string;
  onClose?: () => void;
}

export const openConversationDetailsFlyout = async ({
  core,
  conversationsService,
  conversationTemplatesService,
  conversationId,
  onClose,
}: OpenConversationDetailsFlyoutOptions): Promise<() => void> => {
  const titleId = generateTitleId();
  const queryClient = new QueryClient();

  // A managed flyout rather than `openFlyout`, which hardcodes `session="never"` and closes
  // whatever is already open. Content registered into this flyout can open a flyout of its own —
  // the Security attachment drill-downs do — and sharing a history key is what puts the two in
  // one group, so the second gets a Back button to this one instead of replacing it.
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
      // The key any flyout opened outside its own solution falls back to, which is what the
      // Security flyouts opened from here resolve to.
      historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
      // A managed flyout names itself in the history: without this EUI warns and falls back to
      // "Unknown Flyout", which is also what the Back button of a nested flyout would read.
      title: FLYOUT_TITLE,
      size: 's',
      flyoutMenuDisplayMode: 'always',
      flyoutMenuProps: {},
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

  return () => flyoutRef.close();
};
