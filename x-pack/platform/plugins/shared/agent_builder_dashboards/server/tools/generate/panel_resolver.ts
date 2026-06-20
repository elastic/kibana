/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPanelFailureResult, type ResolvePanelContent } from './core';
import { createVisPanelResolver, type VisPanelResolverDeps } from './core/operations/panels/vis';

/** Host plumbing needed to build the per-type panel resolvers. */
type PanelResolverDeps = VisPanelResolverDeps;

/**
 * Kibana implementation of the core's {@link ResolvePanelContent} contract.
 *
 * A generic dispatcher: it builds the per-panel-type resolvers from host
 * plumbing and routes each request to the resolver for its `type`. Adding a new
 * resolvable panel type means registering its resolver here; the panel-specific
 * resolution logic lives in that type's module under `core/operations/panels`.
 * The generate core consumes the result purely through the contract type.
 */
export const createPanelResolver = (deps: PanelResolverDeps): ResolvePanelContent => {
  const visResolver = createVisPanelResolver(deps);

  return async (request) => {
    switch (request.type) {
      case 'vis':
        return visResolver(request);
      default:
        return createPanelFailureResult(
          request.operationType,
          request.identifier,
          `Inline resolution is not supported for panel type "${request.type}".`
        );
    }
  };
};
