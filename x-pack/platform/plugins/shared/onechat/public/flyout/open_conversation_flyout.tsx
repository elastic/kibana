/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { distinctUntilChanged, from, skip, takeUntil } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { ConversationFlyout } from './conversation_flyout';
import type { OpenConversationFlyoutOptions } from './types';
import type { OnechatInternalService } from '../services';
import type { OnechatStartDependencies } from '../types';
import type { EmbeddableConversationProps } from '../embeddable';
import { OnechatServicesContext } from '../application/context/onechat_services_context';
import { resolveConversationId } from './flyout_conversation_storage';

interface OpenConversationFlyoutParams {
  coreStart: CoreStart;
  services: OnechatInternalService;
  startDependencies: OnechatStartDependencies;
  ConversationComponent: React.ComponentType<EmbeddableConversationProps>;
}

/**
 * Opens a conversation flyout.
 *
 * @param options - Configuration options for the flyout
 * @param params - Internal parameters (services, core, etc.)
 * @returns An object with flyoutRef to close it programmatically and a promise that resolves when closed
 */
export function openConversationFlyout(
  options: OpenConversationFlyoutOptions,
  { coreStart, services, startDependencies, ConversationComponent }: OpenConversationFlyoutParams
): { flyoutRef: OverlayRef; promise: Promise<void> } {
  const {
    overlays,
    application: { currentAppId$ },
    ...startServices
  } = coreStart;

  // Resolve which conversation to load (might restore previous flyout conversation)
  const resolvedConversationId = resolveConversationId({
    conversationId: options.conversationId,
    agentId: options.agentId,
    newChat: options.newChat,
  });

  // Prepare Kibana services context
  const kibanaServices = {
    ...coreStart,
    plugins: startDependencies,
  };

  const flyoutRef = overlays.openFlyout(
    toMountPoint(
      <KibanaContextProvider services={kibanaServices}>
        <OnechatServicesContext.Provider value={services}>
          <ConversationFlyout
            {...options}
            conversationId={resolvedConversationId}
            onClose={() => flyoutRef.close()}
            ConversationComponent={ConversationComponent}
          />
        </OnechatServicesContext.Provider>
      </KibanaContextProvider>,
      startServices
    ),
    {
      'data-test-subj': 'onechat-conversation-flyout-wrapper',
      ownFocus: true,
      onClose: () => flyoutRef.close(),
      isResizable: true,
    }
  );

  // Close the flyout when user navigates out of the current plugin
  currentAppId$
    .pipe(skip(1), takeUntil(from(flyoutRef.onClose)), distinctUntilChanged())
    .subscribe(() => {
      flyoutRef.close();
    });

  return {
    flyoutRef,
    promise: flyoutRef.onClose.then(() => {}),
  };
}
