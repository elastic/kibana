/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { buildVisualizationConfig } from '@kbn/agent-builder-genai-utils';
import { type LensAttachmentPanel } from '@kbn/dashboard-agent-common';
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
  onPanelCreated,
  logger,
}: {
  queries?: VisualizationQueryInput[];
  logger: Logger;
  esClient: IScopedClusterClient;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  onPanelCreated?: (panel: LensAttachmentPanel) => void;
}): Promise<{
  panels: LensAttachmentPanel[];
  failures: VisualizationFailure[];
}> => {
  if (!queries || queries.length === 0) {
    return { panels: [], failures: [] };
  }

  const panels: LensAttachmentPanel[] = [];
  const failures: VisualizationFailure[] = [];

  for (let i = 0; i < queries.length; i++) {
    const { query: nlQuery, index, chartType, esql } = queries[i];

    events.reportProgress(`Creating visualization ${i + 1} of ${queries.length}: "${nlQuery}"`);

    try {
      const { validatedConfig, esqlQuery } = await buildVisualizationConfig({
        nlQuery,
        index,
        chartType,
        esql,
        modelProvider,
        logger,
        events,
        esClient,
      });

      const panelEntry: LensAttachmentPanel = {
        type: 'lens',
        panelId: uuidv4(),
        visualization: validatedConfig,
        title: validatedConfig.title ?? nlQuery.slice(0, 50),
        query: nlQuery,
        esql: esqlQuery,
      };

      panels.push(panelEntry);
      onPanelCreated?.(panelEntry);

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
