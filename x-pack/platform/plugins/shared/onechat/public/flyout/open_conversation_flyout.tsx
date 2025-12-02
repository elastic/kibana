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
import type { OnechatInternalService } from '../services';
import type { ConversationFlyoutRef } from '../types';
import type { EmbeddableConversationProps } from '../embeddable/types';

const htmlId = htmlIdGenerator('onechat-conversation-flyout');

interface OpenConversationFlyoutParams {
  coreStart: CoreStart;
  services: OnechatInternalService;
  onClose?: () => void;
  onPropsUpdate?: (callback: (props: EmbeddableConversationProps) => void) => void;
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
  { coreStart, services, onClose, onPropsUpdate }: OpenConversationFlyoutParams
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

  const { onClose: externalOnClose, ...restOptions } = options;

  const handleOnClose = () => {
    flyoutRef.close(); // Always close the flyout
    externalOnClose?.(); // Call external callback if provided
    onClose?.(); // Call internal cleanup callback
  };

  const ariaLabelledBy = htmlId();

  const flyoutRef = overlays.openFlyout(
    toMountPoint(
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        <LazyEmbeddableConversationComponent
          onClose={handleOnClose}
          ariaLabelledBy={ariaLabelledBy}
          {...restOptions}
          onPropsUpdate={onPropsUpdate}
        />
      </Suspense>,
      startServices
    ),
    {
      'data-test-subj': 'onechat-conversation-flyout-wrapper',
      ownFocus: false,
      isResizable: true,
      type: 'push',
      hideCloseButton: true,
      'aria-labelledby': ariaLabelledBy,
    }
  );

  const conversationFlyoutRef: ConversationFlyoutRef = {
    close: () => {
      flyoutRef.close();
      onClose?.();
    },
  };

  return {
    flyoutRef: conversationFlyoutRef,
  };
}
