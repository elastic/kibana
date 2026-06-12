/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { buildVisualizationConfig, type VisualizationConfig } from '@kbn/agent-builder-tools-base';
import { type ModelProvider, type ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { type AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { VisualizationFailure } from './utils';
import { getErrorMessage } from './utils';

export type VisualizationAttempt =
  | {
      type: 'success';
      visContent: Pick<AttachmentPanel, 'type' | 'config'>;
    }
  | {
      type: 'failure';
      failure: VisualizationFailure;
    };

export type InlineVisualizationOperationType = 'add_section' | 'add_panels' | 'edit_panels';

interface ResolveVisualizationConfigParams {
  operationType: InlineVisualizationOperationType;
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
): Extract<VisualizationAttempt, { type: 'failure' }> => ({
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
