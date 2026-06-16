/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildVisualizationConfig, type VisualizationConfig } from '@kbn/agent-builder-tools-base';
import { type ModelProvider, type ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  getErrorMessage,
  createVisualizationFailureResult,
  type ResolveVisualizationConfig,
} from './core';

/**
 * Kibana implementation of the core's {@link ResolveVisualizationConfig} contract.
 *
 * Builds inline Lens panel content from natural language / ES|QL using Kibana
 * plumbing (`modelProvider`, `esClient`, the visualization builder). The generate
 * core consumes the resulting function purely through the contract type.
 */
export const createVisualizationResolver = ({
  logger,
  modelProvider,
  events,
  esClient,
}: {
  logger: Logger;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}): ResolveVisualizationConfig => {
  return async ({ operationType, identifier, nlQuery, index, chartType, esql, existingPanel }) => {
    try {
      if (existingPanel && existingPanel.type !== LENS_EMBEDDABLE_TYPE) {
        return createVisualizationFailureResult(
          operationType,
          identifier,
          `Panel "${identifier}" with type "${existingPanel.type}" is not supported for inline visualization editing.`
        );
      }

      const existingConfig =
        existingPanel?.type === LENS_EMBEDDABLE_TYPE
          ? (existingPanel?.config as VisualizationConfig)
          : undefined;

      const result = await buildVisualizationConfig({
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
        visContent: {
          type: LENS_EMBEDDABLE_TYPE,
          config: result.validatedConfig,
        },
      };
    } catch (error) {
      return createVisualizationFailureResult(operationType, identifier, getErrorMessage(error));
    }
  };
};
