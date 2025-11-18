/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiLoadingSpinner, htmlIdGenerator } from '@elastic/eui';
import type { OpenConversationFlyoutOptions } from './types';
import type { AgentBuilderInternalService } from '../services';
import type { ConversationFlyoutRef } from '../types';

const htmlId = htmlIdGenerator('agent-builder-conversation-flyout');

interface OpenConversationFlyoutParams {
  coreStart: CoreStart;
  services: AgentBuilderInternalService;
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

  const LazyEmbeddableConversationComponent = lazy(async () => {
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

  const handleOnClose = () => {
    flyoutRef.close();
    options.onClose?.();
  };

  const ariaLabelledBy = htmlId();

  const flyoutRef = overlays.openFlyout(
    toMountPoint(
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        <LazyEmbeddableConversationComponent
          onClose={handleOnClose}
          ariaLabelledBy={ariaLabelledBy}
          {...options}
        />
      </Suspense>,
      startServices
    ),
    {
      'data-test-subj': 'agent-builder-conversation-flyout-wrapper',
      ownFocus: true,
      isResizable: true,
      type: 'push',
      hideCloseButton: true,
      'aria-labelledby': ariaLabelledBy,
    }
  );

  const conversationFlyoutRef: ConversationFlyoutRef = {
    close: () => flyoutRef.close(),
  };

  return {
    flyoutRef: conversationFlyoutRef,
  };
}
