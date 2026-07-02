/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelResolutionRequest, ResolvePanelContent } from '../operations/panels';
import { createVisPanelResolver, type VisPanelResolverDeps } from './vis_panel_resolver';

/** Host plumbing shared by the per-type panel content resolvers. */
export type PanelContentResolverDeps = VisPanelResolverDeps;

/**
 * Default implementation of the generate core's `ResolvePanelContent` seam.
 *
 * Routes each panel resolution request to the resolver registered for its
 * `type` (today only `vis`), so adding a resolvable panel type means
 * registering its resolver here — plus its request builder in
 * `operations/panels` — with no operation-handler changes. The map is total
 * over the `PanelResolutionRequest` union, so a new union member without a
 * resolver fails to compile.
 *
 * It ships in `core/resolvers/` so any caller of the generation core — the
 * dashboard tool or a CLI host — gets a ready-to-use resolver from one place.
 * It is still wired in through the `resolvePanelContent` seam, so tests can
 * inject a fake and a host can substitute its own resolver if ever needed.
 */
export const createPanelContentResolver = (deps: PanelContentResolverDeps): ResolvePanelContent => {
  const resolverByType: { [K in PanelResolutionRequest['type']]: ResolvePanelContent } = {
    vis: createVisPanelResolver(deps),
  };

  return async (request) => {
    const resolveForType: ResolvePanelContent | undefined = resolverByType[request.type];
    if (!resolveForType) {
      throw new Error(`No panel content resolver is registered for panel type "${request.type}".`);
    }

    return resolveForType(request);
  };
};
