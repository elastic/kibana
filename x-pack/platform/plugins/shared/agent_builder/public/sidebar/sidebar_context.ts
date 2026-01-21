/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderInternalService } from '../services';

/**
 * Runtime context for sidebar - contains non-serializable data that cannot
 * be persisted to localStorage (functions, class instances, etc.)
 */
export interface SidebarRuntimeContext {
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
  attachments?: AttachmentInput[];
}

/**
 * Global services needed by the sidebar component.
 * Set during plugin start, accessed by sidebar component.
 */
export interface SidebarServices {
  coreStart: CoreStart;
  services: AgentBuilderInternalService;
}

/**
 * Observable for global services needed by the sidebar component.
 * Set once during plugin start via setSidebarServices().
 */
export const sidebarServices$ = new BehaviorSubject<SidebarServices | null>(null);

/**
 * Observable for runtime context (non-serializable data like browserApiTools, attachments).
 * Updated when opening/closing the sidebar or when active config changes.
 */
export const sidebarRuntimeContext$ = new BehaviorSubject<SidebarRuntimeContext>({});

/**
 * Set global services during plugin start.
 * These are needed by the sidebar component to render the conversation.
 */
export const setSidebarServices = (coreStart: CoreStart, services: AgentBuilderInternalService) => {
  sidebarServices$.next({ coreStart, services });
};

/**
 * Set the runtime context. Call before opening the sidebar or when config changes.
 */
export const setSidebarRuntimeContext = (ctx: SidebarRuntimeContext) => {
  sidebarRuntimeContext$.next(ctx);
};

/**
 * Clear the runtime context. Call when closing the sidebar.
 */
export const clearSidebarRuntimeContext = () => {
  sidebarRuntimeContext$.next({});
};
