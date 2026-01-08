/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph } from '@langchain/langgraph';
import type { ScopedModel, ToolEventEmitter, ModelProvider } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';

import { BuildDashboardStateAnnotation, type BuildDashboardState } from './state';
import {
  DISCOVER_DATA_NODE,
  PLAN_VISUALIZATIONS_NODE,
  CREATE_VISUALIZATION_NODE,
  EMIT_PANEL_NODE,
  FINALIZE_NODE,
} from '../constants';
import {
  createDiscoverDataNode,
  createPlanVisualizationsNode,
  createCreateVisualizationNode,
  createEmitPanelNode,
  createFinalizeNode,
} from './nodes';

export interface BuildDashboardGraphDependencies {
  model: ScopedModel;
  modelProvider: ModelProvider;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
  dashboardLocator: DashboardAppLocator;
  spaces?: SpacesPluginStart;
  request: KibanaRequest;
}

export function createBuildDashboardGraph({
  model,
  modelProvider,
  logger,
  events,
  esClient,
  dashboardLocator,
  spaces,
  request,
}: BuildDashboardGraphDependencies) {
  const discoverDataNode = createDiscoverDataNode({ model, logger, esClient });
  const planVisualizationsNode = createPlanVisualizationsNode({ model, logger, events });
  const createVisualizationNode = createCreateVisualizationNode({
    model,
    modelProvider,
    logger,
    events,
    esClient,
  });
  const emitPanelNode = createEmitPanelNode({ events });
  const finalizeNode = createFinalizeNode({ logger, events, dashboardLocator, spaces, request });

  const discoverySuccessRouter = (state: BuildDashboardState): string => {
    const lastAction = state.actions[state.actions.length - 1];
    if (lastAction?.type === 'discover_data' && !lastAction.success) {
      return FINALIZE_NODE;
    }
    return PLAN_VISUALIZATIONS_NODE;
  };

  const planningSuccessRouter = (state: BuildDashboardState): string => {
    const lastAction = state.actions[state.actions.length - 1];
    if (lastAction?.type === 'plan_visualizations' && !lastAction.success) {
      return FINALIZE_NODE;
    }
    return CREATE_VISUALIZATION_NODE;
  };

  const hasMorePanelsRouter = (state: BuildDashboardState): string => {
    if (state.currentPanelIndex < state.plannedPanels.length) {
      return CREATE_VISUALIZATION_NODE;
    }
    return FINALIZE_NODE;
  };

  const graph = new StateGraph(BuildDashboardStateAnnotation)
    .addNode(DISCOVER_DATA_NODE, discoverDataNode)
    .addNode(PLAN_VISUALIZATIONS_NODE, planVisualizationsNode)
    .addNode(CREATE_VISUALIZATION_NODE, createVisualizationNode)
    .addNode(EMIT_PANEL_NODE, emitPanelNode)
    .addNode(FINALIZE_NODE, finalizeNode)
    .addEdge('__start__', DISCOVER_DATA_NODE)
    .addConditionalEdges(DISCOVER_DATA_NODE, discoverySuccessRouter, {
      [PLAN_VISUALIZATIONS_NODE]: PLAN_VISUALIZATIONS_NODE,
      [FINALIZE_NODE]: FINALIZE_NODE,
    })
    .addConditionalEdges(PLAN_VISUALIZATIONS_NODE, planningSuccessRouter, {
      [CREATE_VISUALIZATION_NODE]: CREATE_VISUALIZATION_NODE,
      [FINALIZE_NODE]: FINALIZE_NODE,
    })
    .addEdge(CREATE_VISUALIZATION_NODE, EMIT_PANEL_NODE)
    .addConditionalEdges(EMIT_PANEL_NODE, hasMorePanelsRouter, {
      [CREATE_VISUALIZATION_NODE]: CREATE_VISUALIZATION_NODE,
      [FINALIZE_NODE]: FINALIZE_NODE,
    })
    .addEdge(FINALIZE_NODE, '__end__')
    .compile();

  return graph;
}
