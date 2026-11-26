/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLensConfig,
  buildVegaConfig,
  type VisualizationConfig,
} from '@kbn/agent-builder-visualizations-server';
import { VEGA_EMBEDDABLE_TYPE } from '@kbn/vega-constants';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  getErrorMessage,
  getVegaSpecText,
  type PanelContentAttempt,
  type VisPanelResolutionRequest,
} from '@kbn/dashboard-agent-authoring';

/** Host plumbing the vis resolver needs to call the visualization builder. */
export interface VisPanelResolverDeps {
  logger: Logger;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

/**
 * Resolves Lens and Vega panel requests for dashboard authoring's
 * `ResolvePanelContent` seam (see `panel_resolver.ts`).
 *
 * Builds inline visualization panel content from natural language / ES|QL using
 * Kibana plumbing (model provider, ES client, the visualization builders). It
 * resolves to a Lens panel (`buildLensConfig`) or, when the caller asks
 * for Vega, a native `vega` panel carrying the Vega-Lite spec in its config
 * (`buildVegaConfig`), and returns it to dashboard authoring through the type-agnostic
 * {@link PanelContentAttempt} contract.
 *
 * It trusts the request's `type`: on edits, upsert has checked that the
 * existing panel is of that kind.
 */
export const createVisPanelResolver = ({
  logger,
  modelProvider,
  events,
  esClient,
}: VisPanelResolverDeps) => {
  return async ({
    nlQuery,
    index,
    chartType,
    esql,
    type,
    preserveESQL,
    applyChartRules,
    existingPanel,
  }: VisPanelResolutionRequest): Promise<PanelContentAttempt> => {
    try {
      if (type === 'vega') {
        if (applyChartRules) {
          throw new Error('Presentation enhancement is only supported for ES|QL Lens panels.');
        }
        const { spec: existingSpec, ...existingConfig } = existingPanel?.config ?? {};
        const { spec, title, authoringNote } = await buildVegaConfig({
          nlQuery,
          index,
          esql,
          existingSpec: getVegaSpecText(existingSpec),
          preserveESQL,
          chartType,
          modelProvider,
          logger,
          events,
          esClient,
        });

        return {
          type: 'success',
          panelContent: {
            type: VEGA_EMBEDDABLE_TYPE,
            config: {
              ...existingConfig,
              spec: { format: 'hjson', value: spec },
              ...(title ? { title } : {}),
            },
          },
          ...(authoringNote ? { authoringNote } : {}),
        };
      }

      const existingConfig = existingPanel?.config as VisualizationConfig | undefined;

      const result = await buildLensConfig({
        nlQuery,
        index,
        chartType,
        esql,
        existingConfig: existingConfig ? JSON.stringify(existingConfig) : undefined,
        parsedExistingConfig: existingConfig,
        preserveESQL,
        applyChartRules,
        modelProvider,
        logger,
        events,
        esClient,
      });

      return {
        type: 'success',
        panelContent: {
          type: LENS_EMBEDDABLE_TYPE,
          config: result.validatedConfig,
        },
        ...(result.authoringNote ? { authoringNote: result.authoringNote } : {}),
      };
    } catch (error) {
      return { type: 'failure', error: getErrorMessage(error) };
    }
  };
};
