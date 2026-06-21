/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildVegaConfig } from '@kbn/agent-builder-tools-base';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import {
  createPanelFailureResult,
  getErrorMessage,
  type PanelContentAttempt,
  type VegaPanelResolutionRequest,
} from './core';
import { VEGA_PANEL_EMBEDDABLE_TYPE, type VegaPanelConfig } from './core/operations/panels/vega';

/** Host plumbing the Vega resolver needs to author a spec. */
export interface VegaPanelResolverDeps {
  logger: Logger;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

/**
 * Read the Vega spec string from an existing Vega panel, or `undefined` if the
 * panel is not a Vega panel (in the by-value Vega embeddable API shape).
 */
const extractExistingVegaSpec = (existingPanel: AttachmentPanel): string | undefined => {
  if (existingPanel.type !== VEGA_PANEL_EMBEDDABLE_TYPE) {
    return undefined;
  }

  const { spec } = existingPanel.config as Partial<VegaPanelConfig>;
  return typeof spec === 'string' ? spec : undefined;
};

/**
 * Build the by-value Vega panel config (Vega embeddable API shape) holding the
 * authored spec string.
 */
const toVegaPanelConfig = (spec: string): AttachmentPanel['config'] =>
  ({
    spec,
  } satisfies VegaPanelConfig);

/**
 * Kibana host implementation of the generate core's `ResolvePanelContent` seam
 * for `vega` panels.
 *
 * The agent reaches for `vega` when Lens cannot express a visualization (small
 * multiples / faceting, repeated layers, bespoke encodings). This resolver asks
 * the model to *invent* a Kibana Vega-Lite spec from the natural-language
 * request (via {@link buildVegaConfig}) and returns it as a by-value `vega`
 * panel in the forthcoming Vega embeddable API shape.
 */
export const createVegaPanelResolver = ({
  logger,
  modelProvider,
  events,
  esClient,
}: VegaPanelResolverDeps) => {
  return async ({
    operationType,
    identifier,
    nlQuery,
    index,
    esql,
    existingPanel,
  }: VegaPanelResolutionRequest): Promise<PanelContentAttempt> => {
    try {
      let existingSpec: string | undefined;
      if (existingPanel) {
        existingSpec = extractExistingVegaSpec(existingPanel);
        if (existingSpec === undefined) {
          return createPanelFailureResult(
            operationType,
            identifier,
            `Panel "${identifier}" with type "${existingPanel.type}" is not a Vega visualization and cannot be edited as one.`
          );
        }
      }

      const { spec } = await buildVegaConfig({
        nlQuery,
        index,
        esql,
        existingSpec,
        modelProvider,
        logger,
        events,
        esClient,
      });

      return {
        type: 'success',
        panelContent: {
          type: VEGA_PANEL_EMBEDDABLE_TYPE,
          config: toVegaPanelConfig(spec),
        },
      };
    } catch (error) {
      return createPanelFailureResult(operationType, identifier, getErrorMessage(error));
    }
  };
};
