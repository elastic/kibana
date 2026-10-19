/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateCustomContentEsql } from '@kbn/agent-builder-visualizations-server';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import type { ResolvePanelContent } from '@kbn/dashboard-agent-authoring';
import { createVisPanelResolver, type VisPanelResolverDeps } from './vis_panel_resolver';
import {
  createCustomContentPanelResolver,
  type CustomContentEsqlGenerator,
} from './custom_content_panel_resolver';

const NO_QUERY_HINT =
  'Pass an exact "index" and a more specific description, or an "esql" the user supplied.';

const createCustomContentEsqlGenerator =
  ({ logger, modelProvider, events, esClient }: VisPanelResolverDeps): CustomContentEsqlGenerator =>
  async ({ nlQuery, index, existingQueries }) => {
    const generated = await generateCustomContentEsql({
      nlQuery,
      index,
      existingQueries,
      modelProvider,
      events,
      logger,
      esClient,
    });
    if (!generated.query) {
      throw new Error(
        `Could not generate an ES|QL query for this panel: ${
          generated.error ?? 'no query was produced'
        }. ${NO_QUERY_HINT}`
      );
    }
    return generated.query;
  };

/**
 * Default implementation of dashboard authoring's `ResolvePanelContent` seam:
 * routes each panel request to the resolver for its `renderer`.
 */
export const createPanelResolver = (deps: VisPanelResolverDeps): ResolvePanelContent => {
  const resolveVisPanel = createVisPanelResolver(deps);
  const resolveCustomContentPanel = createCustomContentPanelResolver({
    resolveTemplate: createCustomContentTemplateResolver(deps),
    generateEsql: createCustomContentEsqlGenerator(deps),
  });

  return (request) =>
    request.renderer === 'custom_content'
      ? resolveCustomContentPanel(request)
      : resolveVisPanel(request);
};
