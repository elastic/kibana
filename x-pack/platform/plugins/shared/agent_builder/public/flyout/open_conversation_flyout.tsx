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
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import type { OpenConversationFlyoutOptions } from './types';
import type { AgentBuilderInternalService } from '../services';
import type { ConversationFlyoutRef } from '../types';
import type { EmbeddableConversationProps } from '../embeddable/types';

const htmlId = htmlIdGenerator('agent-builder-conversation-flyout');

const FLYOUT_SIZE = 600;
const FLYOUT_MIN_WIDTH = 400;

interface OpenConversationFlyoutParams {
  coreStart: CoreStart;
  services: AgentBuilderInternalService;
  onClose?: () => void;
  onRegisterCallbacks?: (callbacks: {
    updateProps: (props: EmbeddableConversationProps) => void;
    resetBrowserApiTools: () => void;
  }) => void;
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
  { coreStart, services, onClose, onRegisterCallbacks }: OpenConversationFlyoutParams
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
          onRegisterCallbacks={onRegisterCallbacks}
        />
      </Suspense>,
      startServices
    ),
    {
      'data-test-subj': 'agent-builder-conversation-flyout-wrapper',
      ownFocus: false,
      type: 'push',
      hideCloseButton: true,
      'aria-labelledby': ariaLabelledBy,
      isResizable: true,
      size: FLYOUT_SIZE, // Initial size of the flyout, it remains resizable up to {maxWidth}
      maxWidth: 1200, // Maximum width for resizable flyout to prevent NaN error
      css: css`
        z-index: ${euiThemeVars.euiZFlyout + 3};
        min-width: ${FLYOUT_MIN_WIDTH}px;
      `,
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
