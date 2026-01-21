/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useObservable } from '@kbn/use-observable';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { SidebarBody } from '@kbn/core-chrome-sidebar-components';
import { EmbeddableConversationInternal } from '../embeddable/embeddable_conversation';
import {
  sidebarServices$,
  sidebarRuntimeContext$,
  clearSidebarRuntimeContext,
} from './sidebar_context';
import type { SidebarParams } from './sidebar_params';

/**
 * Main sidebar conversation component.
 * Receives serializable params from sidebar API and retrieves non-serializable
 * runtime context (browserApiTools, attachments) via observables.
 *
 * This component is lazy-loaded via loadComponent in the sidebar registration.
 */
export function SidebarConversation({
  params,
  onClose,
}: SidebarComponentProps<SidebarParams>): React.ReactElement {
  const services = useObservable(sidebarServices$);
  const runtimeContext = useObservable(sidebarRuntimeContext$, {});

  // Handle sidebar close - clear runtime context and invoke onClose callback
  const handleClose = useCallback(() => {
    clearSidebarRuntimeContext();
    onClose();
  }, [onClose]);

  if (!services) {
    throw new Error(
      'Sidebar services not initialized. Ensure setSidebarServices() is called during plugin start.'
    );
  }

  return (
    <SidebarBody>
      <EmbeddableConversationInternal
        coreStart={services.coreStart}
        services={services.services}
        onClose={handleClose}
        ariaLabelledBy="agent-builder-sidebar"
        sessionTag={params.sessionTag}
        agentId={params.agentId}
        initialMessage={params.initialMessage}
        autoSendInitialMessage={params.autoSendInitialMessage}
        newConversation={params.newConversation}
        browserApiTools={runtimeContext.browserApiTools}
        attachments={runtimeContext.attachments}
      />
    </SidebarBody>
  );
}
