/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCustomContentConfig } from '@kbn/agent-builder-visualizations-server';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  readEsqlQuery,
  toEsqlQueryState,
  type CustomContentState,
} from '@kbn/custom-content-common';
import {
  getErrorMessage,
  type CustomContentPanelResolutionRequest,
  type PanelContentAttempt,
} from '@kbn/dashboard-agent-authoring';
import type { VisPanelResolverDeps } from './vis_panel_resolver';

/**
 * Resolves custom content panel requests with the custom content builder. New panels get a query
 * and a template generated from the request; edits refine the existing panel, keeping its query
 * unless the request replaces, removes or regenerates it, and keeping its other settings. On edits,
 * upsert has already checked that the existing panel is custom content.
 */
export const createCustomContentPanelResolver = ({
  logger,
  modelProvider,
  events,
  esClient,
}: VisPanelResolverDeps) => {
  return async (request: CustomContentPanelResolutionRequest): Promise<PanelContentAttempt> => {
    const { nlQuery, index, esql, hasData, existingPanel, resolveEsqlVariables } = request;
    const regenerateESQL = request.existingPanel ? request.regenerateESQL : undefined;
    try {
      const existing = existingPanel?.config as CustomContentState | undefined;
      const { esqlQuery, template } = await buildCustomContentConfig({
        nlQuery,
        index,
        esql,
        hasData,
        regenerateESQL,
        resolveEsqlVariables,
        existing: existing && { esqlQuery: readEsqlQuery(existing), template: existing.template },
        modelProvider,
        logger,
        events,
        esClient,
      });
      return {
        type: 'success',
        panelContent: {
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { ...existing, esql_query: toEsqlQueryState(esqlQuery), template },
        },
      };
    } catch (error) {
      return { type: 'failure', error: getErrorMessage(error) };
    }
  };
};
