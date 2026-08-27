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
import type { ConversationTemplatesService } from '../services/conversation_templates';
import { ConversationMetadataFlyoutSnapshot } from './conversation_metadata_flyout';

const generateTitleId = htmlIdGenerator('agentBuilderConversationMetadataFlyoutTitle');

export interface OpenConversationMetadataFlyoutOptions {
  core: CoreStart;
  conversationsService: ConversationsService;
  conversationTemplatesService: ConversationTemplatesService;
  conversationId: string;
  onClose?: () => void;
}

export const openConversationMetadataFlyout = async ({
  core,
  conversationsService,
  conversationTemplatesService,
  conversationId,
  onClose,
}: OpenConversationMetadataFlyoutOptions): Promise<() => void> => {
  const titleId = generateTitleId();
  const queryClient = new QueryClient();

  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(
      <QueryClientProvider client={queryClient}>
        <ConversationMetadataFlyoutSnapshot
          conversationId={conversationId}
          conversationsService={conversationsService}
          conversationTemplatesService={conversationTemplatesService}
          titleId={titleId}
        />
      </QueryClientProvider>,
      core.rendering
    ),
    {
      size: 's',
      type: 'push',
      paddingSize: 'm',
      'data-test-subj': 'agentBuilderConversationMetadataFlyout-snapshot',
      'aria-labelledby': titleId,
      onClose: (ref) => ref.close(),
    }
  );

  flyoutRef.onClose.then(() => {
    onClose?.();
  });

  return () => flyoutRef.close();
};
