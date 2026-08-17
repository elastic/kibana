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
import type { ConversationsService } from '../services/conversations/conversations_service';

const generateTitleId = htmlIdGenerator('agentBuilderConversationMetadataFlyoutTitle');

export const openConversationMetadataFlyout = async (
  core: CoreStart,
  conversationsService: ConversationsService,
  conversationId: string,
  onClose?: () => void
): Promise<() => void> => {
  const { ConversationMetadataFlyoutSnapshot } = await import('./conversation_metadata_flyout');
  const titleId = generateTitleId();
  const queryClient = new QueryClient();

  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(
      <QueryClientProvider client={queryClient}>
        <ConversationMetadataFlyoutSnapshot
          conversationId={conversationId}
          conversationsService={conversationsService}
          titleId={titleId}
        />
      </QueryClientProvider>,
      core.rendering
    ),
    {
      size: 's',
      type: 'push',
      'data-test-subj': 'agentBuilderConversationMetadataFlyout',
      'aria-labelledby': titleId,
      onClose: (ref) => ref.close(),
    }
  );

  flyoutRef.onClose.then(() => {
    onClose?.();
  });

  return () => flyoutRef.close();
};
