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
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { OpenConversationDetailsSystemFlyout } from '@kbn/agent-builder-browser';
import type { ConversationsService } from '../services/conversations/conversations_service';
import type { ConversationTemplatesService } from '../services/conversation_templates';
import { ConversationDetailsFlyoutSnapshot } from './conversation_details_flyout';

const generateTitleId = htmlIdGenerator('agentBuilderConversationDetailsFlyoutTitle');

export interface OpenConversationDetailsFlyoutOptions {
  core: CoreStart;
  conversationsService: ConversationsService;
  conversationTemplatesService: ConversationTemplatesService;
  conversationId: string;
  onClose?: () => void;
  /**
   * Starts a Flyout V2 session. Required for a child flyout's Back button to return here.
   * The legacy `openFlyout` path forces `session="never"` and cannot be that parent.
   */
  systemFlyout?: OpenConversationDetailsSystemFlyout;
}

export const openConversationDetailsFlyout = async ({
  core,
  conversationsService,
  conversationTemplatesService,
  conversationId,
  onClose,
  systemFlyout,
}: OpenConversationDetailsFlyoutOptions): Promise<() => void> => {
  const titleId = generateTitleId();
  const queryClient = new QueryClient();
  const content = (
    <QueryClientProvider client={queryClient}>
      <ConversationDetailsFlyoutSnapshot
        conversationId={conversationId}
        conversationsService={conversationsService}
        conversationTemplatesService={conversationTemplatesService}
        titleId={titleId}
      />
    </QueryClientProvider>
  );

  if (systemFlyout) {
    const flyoutRef = core.overlays.openSystemFlyout(content, {
      size: 's',
      flyoutMenuDisplayMode: 'always',
      type: 'push',
      paddingSize: 'm',
      role: 'region',
      'data-test-subj': 'agentBuilderConversationDetailsFlyout-snapshot',
      'aria-labelledby': titleId,
      historyKey: systemFlyout.historyKey,
      session: 'start',
      ...(systemFlyout.title ? { title: systemFlyout.title } : {}),
    });

    flyoutRef.onClose.then(() => {
      onClose?.();
    });

    return () => flyoutRef.close();
  }

  const flyoutRef = core.overlays.openFlyout(toMountPoint(content, core.rendering), {
    size: 's',
    flyoutMenuDisplayMode: 'always',
    flyoutMenuProps: {},
    type: 'push',
    paddingSize: 'm',
    role: 'region',
    'data-test-subj': 'agentBuilderConversationDetailsFlyout-snapshot',
    'aria-labelledby': titleId,
    onClose: (ref) => ref.close(),
  });

  flyoutRef.onClose.then(() => {
    onClose?.();
  });

  return () => flyoutRef.close();
};
