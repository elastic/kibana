/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useObservable } from '@kbn/use-observable';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { SidebarBody } from '@kbn/core-chrome-sidebar-components';
import { createEmbeddableConversation } from '../embeddable/create_embeddable_conversation';
import { sidebarServices$, sidebarRuntimeContext$ } from './sidebar_context';

/**
 * Sidebar conversation component.
 * Uses createEmbeddableConversation (same as flyout) and passes onRegisterCallbacks
 * to enable prop updates and browser API tool resets.
 */
export function SidebarConversation({
  onClose,
}: SidebarComponentProps<{}>): React.ReactElement | null {
  const services = useObservable(sidebarServices$);
  const runtimeContext = useObservable(sidebarRuntimeContext$);

  if (!services) {
    throw new Error(
      'Sidebar services not initialized. Ensure setSidebarServices() is called during plugin start.'
    );
  }

  if (!runtimeContext) {
    return null;
  }

  const { coreStart, services: internalServices } = services;
  const { options, onRegisterCallbacks, onClose: contextOnClose } = runtimeContext;
  const { onClose: externalOnClose, ...restOptions } = options;

  const ConversationComponent = createEmbeddableConversation({
    services: internalServices,
    coreStart,
  });

  const handleOnClose = () => {
    onClose(); // closes the sidebar panel
    externalOnClose?.(); // calls the consumer's optionally defined onClose callback
    contextOnClose?.(); // clears up internal implementation in plugin and context
  };

  return (
    <SidebarBody>
      <ConversationComponent
        onClose={handleOnClose}
        ariaLabelledBy="agent-builder-sidebar"
        onRegisterCallbacks={onRegisterCallbacks}
        {...restOptions}
      />
    </SidebarBody>
  );
}
