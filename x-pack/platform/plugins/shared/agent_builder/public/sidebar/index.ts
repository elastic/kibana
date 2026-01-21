/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Context and services (loaded eagerly)
export {
  sidebarServices$,
  sidebarRuntimeContext$,
  setSidebarServices,
  setSidebarRuntimeContext,
  clearSidebarRuntimeContext,
} from './sidebar_context';
export type { SidebarRuntimeContext, SidebarServices } from './sidebar_context';

// Params schema (loaded eagerly for registration)
export { getParamsSchema } from './sidebar_params';
export type { SidebarParams } from './sidebar_params';

// Component is NOT exported here - it should be lazy-loaded via:
// loadComponent: () => import('./sidebar/sidebar_conversation').then(m => m.SidebarConversation)
