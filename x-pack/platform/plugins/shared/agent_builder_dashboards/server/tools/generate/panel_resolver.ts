/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  createVisPanelResolver,
  type PanelResolutionRequest,
  type ResolvePanelContent,
} from './core';
import { createVegaPanelResolver } from './vega_panel_resolver';

/** Host plumbing shared by every per-type panel resolver. */
export interface PanelResolverDeps {
  logger: Logger;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

/**
 * Kibana host implementation of the generate core's `ResolvePanelContent` seam.
 *
 * Routes each panel resolution request to the resolver for its `type`: `vis`
 * builds inline Lens content, `vega` invents a custom Vega-Lite spec. Adding a
 * new resolvable panel type means adding its resolver and a branch here. The
 * dispatcher lives outside `core/` so the generation core stays free of
 * Kibana-only dependencies and remains reusable by third parties.
 */
export const createPanelContentResolver = (deps: PanelResolverDeps): ResolvePanelContent => {
  const resolveVisPanel = createVisPanelResolver(deps);
  const resolveVegaPanel = createVegaPanelResolver(deps);

  return (request: PanelResolutionRequest) => {
    switch (request.type) {
      case 'vega':
        return resolveVegaPanel(request);
      case 'vis':
        return resolveVisPanel(request);
    }
  };
};
