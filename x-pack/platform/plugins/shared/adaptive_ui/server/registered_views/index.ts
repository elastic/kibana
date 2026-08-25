/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createViewRegistry,
  validateView,
  type PrimitiveNode,
  type ViewRegistry,
} from '@kbn/adaptive-ui';
import { significantEventView } from './significant_event';
import { investigationView } from './investigation';

/** Registry of code-owned Adaptive UI views the agent can request by id. */
export const createAdaptiveUiViewRegistry = (): ViewRegistry<unknown, PrimitiveNode> => {
  const registry = createViewRegistry(validateView);
  registry.register(significantEventView);
  registry.register(investigationView);
  return registry;
};

export { significantEventView } from './significant_event';
export type { SignificantEventAttachmentInput } from './significant_event';
export { investigationView, toInvestigationViewSpec } from './investigation';
export type { InvestigationInput } from './investigation';
export { resolveLiveView } from './resolve_live_view';
export type { ResolveLiveViewDeps, ResolveLiveViewResult } from './resolve_live_view';
