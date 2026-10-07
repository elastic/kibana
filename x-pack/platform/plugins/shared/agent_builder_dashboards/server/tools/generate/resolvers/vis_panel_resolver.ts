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
import {
  readVegaPanelSpec,
  toVegaPanelSpec,
  VEGA_VIS_TYPE,
} from '@kbn/agent-builder-visualizations-common';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createPanelFailureResult, type PanelContentAttempt } from '@kbn/dashboard-authoring';
import { getErrorMessage } from '@kbn/dashboard-authoring';
import type { VisPanelResolutionRequest } from '@kbn/dashboard-authoring';

/** Host plumbing the vis resolver needs to call the visualization builder. */
export interface VisPanelResolverDeps {
  logger: Logger;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

/** Pull the serialized Vega spec out of an existing Vega panel's attachment config. */
const getExistingVegaSpec = (existingPanel: AttachmentPanel | undefined): string | undefined =>
  readVegaPanelSpec((existingPanel?.config as { spec?: unknown } | undefined)?.spec);

/**
 * Resolves Lens and Vega panel requests for the generate core's
 * `ResolvePanelContent` seam (see `panel_resolver.ts`).
 *
 * Builds inline visualization panel content from natural language / ES|QL using
 * Kibana plumbing (model provider, ES client, the visualization builders). It
 * resolves to a Lens panel (`buildLensConfig`) or, when the caller asks
 * for Vega, a native `vega` panel carrying the Vega-Lite spec as HJSON in its config
 * (`buildVegaConfig`), and returns it to the core through the type-agnostic
 * {@link PanelContentAttempt} contract.
 *
 * It trusts the request's `renderer` (Lens when omitted). On edits,
 * upsert sets it from the existing panel and rejects panels neither
 * renderer can edit, so the existing panel always matches the renderer.
 */
export const createVisPanelResolver = ({
  logger,
  modelProvider,
  events,
  esClient,
}: VisPanelResolverDeps) => {
  return async ({
    identifier,
    nlQuery,
    index,
    chartType,
    esql,
    renderer = 'lens',
    preserveESQL,
    applyChartRules,
    existingPanel,
  }: VisPanelResolutionRequest): Promise<PanelContentAttempt> => {
    try {
      if (renderer === 'vega') {
        if (applyChartRules) {
          throw new Error('Presentation enhancement is only supported for ES|QL Lens panels.');
        }
        const { spec, title, authoringNote } = await buildVegaConfig({
          nlQuery,
          index,
          esql,
          existingSpec: getExistingVegaSpec(existingPanel),
          preserveESQL,
          chartType,
          modelProvider,
          logger,
          events,
          esClient,
        });

        // Store the native Vega API shape in the attachment. A temporary converter
        // expands it to the legacy-vis embeddable when the dashboard is
        // materialized for rendering.
        return {
          type: 'success',
          panelContent: {
            type: VEGA_VIS_TYPE,
            config: { spec: toVegaPanelSpec(spec), ...(title ? { title } : {}) },
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
      return createPanelFailureResult(identifier, getErrorMessage(error));
    }
  };
};
