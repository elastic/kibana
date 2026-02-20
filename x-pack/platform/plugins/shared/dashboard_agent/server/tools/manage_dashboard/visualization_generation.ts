/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  createVisualizationGraph,
  guessChartType,
  getSchemaForChartType,
} from '@kbn/agent-builder-platform-plugin/server';
import {
  DASHBOARD_PANEL_ADDED_EVENT,
  type AttachmentPanel,
  type DashboardUiEvent,
  type LensAttachmentPanel,
} from '@kbn/dashboard-agent-common';
import { getErrorMessage, type VisualizationFailure } from './utils';

export interface VisualizationQueryInput {
  query: string;
  index?: string;
  chartType?: SupportedChartType;
  esql?: string;
}

export const buildVisualizationsFromQueriesWithLLM = async ({
  queries,
  modelProvider,
  esClient,
  events,
  sendIncrementalEvents,
  logger,
}: {
  queries?: VisualizationQueryInput[];
  logger: Logger;
  esClient: IScopedClusterClient;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  sendIncrementalEvents: (
    panels: AttachmentPanel[],
    eventType: DashboardUiEvent['data']['custom_event']
  ) => void;
}): Promise<{
  panels: LensAttachmentPanel[];
  failures: VisualizationFailure[];
}> => {
  if (!queries || queries.length === 0) {
    return { panels: [], failures: [] };
  }

  const panels: LensAttachmentPanel[] = [];
  const failures: VisualizationFailure[] = [];

  const model = await modelProvider.getDefaultModel();
  const graph = createVisualizationGraph(model, logger, events, esClient);

  for (let i = 0; i < queries.length; i++) {
    const { query: nlQuery, index, chartType, esql } = queries[i];

    events.reportProgress?.(`Creating visualization ${i + 1} of ${queries.length}: "${nlQuery}"`);

    try {
      let selectedChartType: SupportedChartType = chartType || SupportedChartType.Metric;
      if (!chartType) {
        logger.debug('Chart type not provided, using LLM to suggest one');
        selectedChartType = await guessChartType(modelProvider, nlQuery);
      }

      const schema = getSchemaForChartType(selectedChartType);

      const finalState = await graph.invoke({
        nlQuery,
        index,
        chartType: selectedChartType,
        schema,
        existingConfig: undefined,
        parsedExistingConfig: null,
        esqlQuery: esql || '',
        currentAttempt: 0,
        actions: [],
        validatedConfig: null,
        error: null,
      });

      const { validatedConfig, error, currentAttempt, esqlQuery } = finalState;

      if (!validatedConfig) {
        throw new Error(
          `Failed to generate valid configuration after ${currentAttempt} attempts. Last error: ${
            error || 'Unknown error'
          }`
        );
      }

      const panelEntry: LensAttachmentPanel = {
        type: 'lens',
        panelId: uuidv4(),
        visualization: validatedConfig,
        title: validatedConfig.title ?? nlQuery.slice(0, 50),
        query: nlQuery,
        esql: esqlQuery,
      };

      panels.push(panelEntry);
      sendIncrementalEvents([panelEntry], DASHBOARD_PANEL_ADDED_EVENT);

      logger.debug(`Created lens visualization: ${panelEntry.panelId}`);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Error creating visualization for query "${nlQuery}": ${errorMessage}`);
      failures.push({
        type: 'generated_visualization',
        identifier: nlQuery,
        error: errorMessage,
      });
    }
  }

  return { panels, failures };
};
