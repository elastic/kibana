/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiLoadingSpinner } from '@elastic/eui';
import { ConversationFlyout } from './conversation_flyout';
import type { OpenConversationFlyoutOptions } from './types';
import type { OnechatInternalService } from '../services';
import type { ConversationFlyoutRef } from '../types';

interface OpenConversationFlyoutParams {
  coreStart: CoreStart;
  services: OnechatInternalService;
}

/**
 * Opens a conversation flyout.
 *
 * @param options - Configuration options for the flyout
 * @param params - Internal parameters (services, core, etc.)
 * @returns An object with flyoutRef to close it programmatically
 */
export function openConversationFlyout(
  options: OpenConversationFlyoutOptions,
  { coreStart, services }: OpenConversationFlyoutParams
): { flyoutRef: ConversationFlyoutRef } {
  const { overlays, application, ...startServices } = coreStart;

  const LazyConversationComponent = lazy(async () => {
    const { createEmbeddableConversation } = await import(
      '../embeddable/create_embeddable_conversation'
    );
    const ConversationComponent = createEmbeddableConversation({
      services,
      coreStart,
    });
    return {
      default: ConversationComponent,
    };
  });

  const flyoutRef = overlays.openFlyout(
    toMountPoint(
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        <ConversationFlyout
          {...options}
          onClose={() => flyoutRef.close()}
          ConversationComponent={LazyConversationComponent}
        />
      </Suspense>,
      startServices
    ),
    {
      'data-test-subj': 'onechat-conversation-flyout-wrapper',
      ownFocus: true,
      onClose: () => {
        flyoutRef.close();
        options.onClose?.();
      },
      isResizable: true,
      size: '1000px',
      type: 'push',
    }
  );

  const conversationFlyoutRef: ConversationFlyoutRef = {
    close: () => flyoutRef.close(),
  };

  return {
    flyoutRef: conversationFlyoutRef,
  };
}
