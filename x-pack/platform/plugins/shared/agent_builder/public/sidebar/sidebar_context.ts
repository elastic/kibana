/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderInternalService } from '../services';
import type { OpenConversationSidebarOptions } from './types';
import type { EmbeddableConversationProps } from '../embeddable/types';

/**
 * Services set once at plugin start
 */
interface SidebarServices {
  coreStart: CoreStart;
  services: AgentBuilderInternalService;
}

export const sidebarServices$ = new BehaviorSubject<SidebarServices | null>(null);
/**
 * Set global services during plugin start.
 * These are needed by the sidebar component to render the conversation.
 */
export const setSidebarServices = (coreStart: CoreStart, services: AgentBuilderInternalService) => {
  sidebarServices$.next({ coreStart, services });
};

/**
 * Runtime context set before each sidebar open
 */
export interface SidebarRuntimeContext {
  options: OpenConversationSidebarOptions;
  onClose?: () => void;
  onRegisterCallbacks?: (callbacks: {
    updateProps: (props: EmbeddableConversationProps) => void;
    resetBrowserApiTools: () => void;
  }) => void;
}

export const sidebarRuntimeContext$ = new BehaviorSubject<SidebarRuntimeContext | null>(null);

export const setSidebarRuntimeContext = (ctx: SidebarRuntimeContext) => {
  sidebarRuntimeContext$.next(ctx);
};

/**
 * Clear the runtime context. Call when closing the sidebar.
 */
export const clearSidebarRuntimeContext = () => {
  sidebarRuntimeContext$.next(null);
};
