/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { buildVisualizationConfig, type VisualizationConfig } from '@kbn/agent-builder-genai-utils';
import { type ModelProvider, type ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  fromEmbeddablePanel,
  type AttachmentPanel,
  type VisualizationContent,
} from '@kbn/dashboard-agent-common';
import type { VisualizationFailure } from './utils';
import { getErrorMessage } from './utils';

export type VisualizationAttempt =
  | {
      type: 'success';
      visContent: VisualizationContent;
    }
  | {
      type: 'failure';
      failure: VisualizationFailure;
    };

interface ResolveVisualizationConfigParams {
  operationType: 'add_section' | 'create_visualization_panels' | 'edit_visualization_panels';
  identifier: string;
  nlQuery: string;
  index?: string;
  chartType?: SupportedChartType;
  esql?: string;
  existingPanel?: AttachmentPanel;
}

export type ResolveVisualizationConfig = (
  params: ResolveVisualizationConfigParams
) => Promise<VisualizationAttempt>;

export const createVisualizationFailureResult = (
  type: VisualizationFailure['type'],
  identifier: string,
  error: string
): VisualizationAttempt => ({
  type: 'failure',
  failure: {
    type,
    identifier,
    error,
  },
});

/**
 * Builds inline Lens panel content from natural language.
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
      if (existingPanel && existingPanel.type !== 'lens') {
        return createVisualizationFailureResult(
          operationType,
          identifier,
          `Panel "${identifier}" with type "${existingPanel.type}" is not supported for inline visualization editing.`
        );
      }

      const existingConfig =
        existingPanel?.type === 'lens'
          ? (fromEmbeddablePanel(existingPanel).config as VisualizationConfig)
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
          type: 'lens',
          config: result.validatedConfig,
        },
      };
    } catch (error) {
      return createVisualizationFailureResult(operationType, identifier, getErrorMessage(error));
    }
  };
};
