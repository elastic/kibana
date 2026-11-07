/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createPanelContentResolver,
  type ResolvePanelContent,
} from '@kbn/dashboard-agent-authoring';
import { createVisPanelResolver, type VisPanelResolverDeps } from './vis_panel_resolver';
import { createCustomContentPanelResolver } from './custom_content_panel_resolver';

/**
 * Default implementation of dashboard authoring's `ResolvePanelContent` seam: the executor of
 * each request panel kind, keyed by its `type`.
 */
export const createPanelResolver = (deps: VisPanelResolverDeps): ResolvePanelContent => {
  const resolveVisPanel = createVisPanelResolver(deps);
  const resolveCustomContentPanel = createCustomContentPanelResolver(deps);

  return createPanelContentResolver({
    vis: resolveVisPanel,
    vega: resolveVisPanel,
    custom_content: resolveCustomContentPanel,
  });
};
