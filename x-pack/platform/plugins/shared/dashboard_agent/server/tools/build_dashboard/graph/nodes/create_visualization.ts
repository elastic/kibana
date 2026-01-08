/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel, ToolEventEmitter, ModelProvider } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import {
  createVisualizationGraph,
  guessChartType,
  getSchemaForChartType,
} from '@kbn/agent-builder-platform-plugin/server';

import type { BuildDashboardState } from '../state';
import type { CreateVisualizationAction } from '../../types';

export interface CreateVisualizationNodeDeps {
  model: ScopedModel;
  modelProvider: ModelProvider;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

export function createCreateVisualizationNode({
  model,
  modelProvider,
  logger,
  events,
  esClient,
}: CreateVisualizationNodeDeps) {
  return async (state: BuildDashboardState) => {
    const panelIndex = state.currentPanelIndex;
    const panel = state.plannedPanels[panelIndex];

    if (!panel) {
      return { currentPanelIndex: panelIndex + 1 };
    }

    let action: CreateVisualizationAction;
    try {
      const targetIndex = state.discoveredIndex;
      const nlQuery = panel.description;

      const chartType = await guessChartType(modelProvider, '', nlQuery);
      const schema = getSchemaForChartType(chartType);

      const vizGraph = createVisualizationGraph(model, logger, events, esClient);

      const vizState = await vizGraph.invoke({
        nlQuery,
        index: targetIndex,
        chartType,
        schema,
        existingConfig: undefined,
        parsedExistingConfig: null,
        esqlQuery: '',
        currentAttempt: 0,
        actions: [],
        validatedConfig: null,
        error: null,
      });

      if (!vizState.validatedConfig) {
        throw new Error(vizState.error || 'Failed to generate visualization');
      }

      const configWithTitle = {
        ...vizState.validatedConfig,
        title: panel.title || vizState.validatedConfig.title,
      };

      action = {
        type: 'create_visualization',
        success: true,
        panelIndex,
        config: configWithTitle,
      };

      return {
        createdPanels: [configWithTitle],
        currentPanelIndex: panelIndex + 1,
        actions: [action],
      };
    } catch (error) {
      logger.error(`Failed to create visualization ${panelIndex}: ${error.message}`);
      action = {
        type: 'create_visualization',
        success: false,
        panelIndex,
        error: error.message,
      };

      return {
        currentPanelIndex: panelIndex + 1,
        actions: [action],
      };
    }
  };
}
