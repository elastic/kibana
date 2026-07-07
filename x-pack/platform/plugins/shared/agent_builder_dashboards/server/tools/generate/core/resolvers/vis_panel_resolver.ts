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
  VEGA_VIS_TYPE,
  type VisualizationRenderer,
} from '@kbn/agent-builder-visualizations-common';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createPanelFailureResult, type PanelContentAttempt } from '../resolve_panel';
import { getErrorMessage } from '../utils';
import type { VisPanelResolutionRequest } from '../operations/panels';

/** Host plumbing the vis resolver needs to call the visualization builder. */
export interface VisPanelResolverDeps {
  logger: Logger;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

/**
 * Resolve the renderer for a vis panel request. Edits keep the existing panel's
 * renderer (inferred from its embeddable type); new panels honor the caller's
 * choice and default to Lens (the common case) when it is omitted. Returns
 * `undefined` for an existing panel whose type neither renderer can edit.
 */
const resolveRenderer = (
  existingPanel: AttachmentPanel | undefined,
  requestedRenderer: VisualizationRenderer | undefined
): VisualizationRenderer | undefined => {
  if (existingPanel) {
    if (existingPanel.type === LENS_EMBEDDABLE_TYPE) {
      return 'lens';
    }
    if (existingPanel.type === VEGA_VIS_TYPE) {
      return 'vega';
    }
    return undefined;
  }
  return requestedRenderer ?? 'lens';
};

/** Pull the serialized Vega spec out of an existing Vega panel's attachment config. */
const getExistingVegaSpec = (existingPanel: AttachmentPanel | undefined): string | undefined => {
  const spec = (existingPanel?.config as { spec?: unknown } | undefined)?.spec;
  return typeof spec === 'string' ? spec : undefined;
};

/**
 * Default implementation of the generate core's `ResolvePanelContent` seam for
 * `vis` panels.
 *
 * Builds inline visualization panel content from natural language / ES|QL using
 * Kibana plumbing (model provider, ES client, the visualization builders). It
 * resolves to a Lens panel (`buildLensConfig`) or, when the caller asks
 * for Vega, a `vega` panel carrying a serialized Vega-Lite spec in its config
 * (`buildVegaConfig`), and returns it to the core through the type-agnostic
 * {@link PanelContentAttempt} contract.
 *
 * It ships in `core/resolvers/` so any caller of the generation core — the
 * dashboard tool or a CLI host — gets a ready-to-use vis resolver from one
 * place. It is still wired in through the `resolvePanelContent` seam, so tests
 * can inject a fake and a host can substitute its own resolver if ever needed.
 */
export const createVisPanelResolver = ({
  logger,
  modelProvider,
  events,
  esClient,
}: VisPanelResolverDeps) => {
  return async ({
    operationType,
    identifier,
    nlQuery,
    index,
    chartType,
    esql,
    renderer: requestedRenderer,
    existingPanel,
  }: VisPanelResolutionRequest): Promise<PanelContentAttempt> => {
    try {
      const renderer = resolveRenderer(existingPanel, requestedRenderer);
      if (!renderer) {
        return createPanelFailureResult(
          operationType,
          identifier,
          `Panel "${identifier}" with type "${existingPanel?.type}" is not supported for inline visualization editing.`
        );
      }

      if (renderer === 'vega') {
        const { spec } = await buildVegaConfig({
          nlQuery,
          index,
          esql,
          existingSpec: getExistingVegaSpec(existingPanel),
          chartType,
          modelProvider,
          logger,
          events,
          esClient,
        });

        // Store the (future) native Vega API shape in the attachment: a `vega`
        // panel whose `config.spec` is the serialized spec. A temporary converter
        // expands this to the legacy-vis embeddable when the dashboard is
        // materialized for rendering.
        return {
          type: 'success',
          panelContent: {
            type: VEGA_VIS_TYPE,
            config: { spec },
          },
        };
      }

      const existingConfig =
        existingPanel?.type === LENS_EMBEDDABLE_TYPE
          ? (existingPanel?.config as VisualizationConfig)
          : undefined;

      const result = await buildLensConfig({
        nlQuery,
        index,
        chartType,
        esql,
        existingConfig: existingConfig ? JSON.stringify(existingConfig) : undefined,
        parsedExistingConfig: existingConfig,
        includeTimeRange: false,
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
      };
    } catch (error) {
      return createPanelFailureResult(operationType, identifier, getErrorMessage(error));
    }
  };
};
