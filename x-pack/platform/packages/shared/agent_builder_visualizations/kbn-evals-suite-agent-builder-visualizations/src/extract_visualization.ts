/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

const CREATE_VISUALIZATION_TOOL_ID = platformCoreTools.createVisualization;
const VISUALIZATION_RESULT_TYPE = 'visualization';

interface ConverseLikeOutput {
  steps?: Array<Record<string, unknown>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export interface ExtractedVisualization {
  esql: string;
  chartType?: string;
  renderer?: 'lens' | 'vega';
  visualization?: Record<string, unknown> & { spec?: string };
  attachmentId?: string;
}

/**
 * Extract every generated visualization payload from create_visualization tool results.
 */
export function extractVisualizations(output: ConverseLikeOutput): ExtractedVisualization[] {
  const steps = output?.steps ?? [];
  const visualizations: ExtractedVisualization[] = [];

  for (const step of steps) {
    if (
      step.type !== 'tool_call' ||
      step.tool_id !== CREATE_VISUALIZATION_TOOL_ID ||
      !Array.isArray(step.results)
    ) {
      continue;
    }

    for (const candidate of step.results) {
      if (
        !isRecord(candidate) ||
        candidate.type !== VISUALIZATION_RESULT_TYPE ||
        !isRecord(candidate.data)
      ) {
        continue;
      }

      const {
        esql,
        chart_type: chartType,
        renderer,
        visualization,
        attachment_id: attachmentId,
      } = candidate.data;

      if (typeof esql !== 'string' || esql.trim().length === 0) {
        continue;
      }

      const extracted: ExtractedVisualization = { esql };

      if (typeof chartType === 'string' && chartType.trim().length > 0) {
        extracted.chartType = chartType;
      }
      if (renderer === 'lens' || renderer === 'vega') {
        extracted.renderer = renderer;
      }
      if (isRecord(visualization)) {
        extracted.visualization = visualization as Record<string, unknown> & { spec?: string };
      }
      if (typeof attachmentId === 'string' && attachmentId.trim().length > 0) {
        extracted.attachmentId = attachmentId;
      }

      visualizations.push(extracted);
    }
  }

  return visualizations;
}

/**
 * Extract the ES|QL strings backing every generated visualization. Returns an
 * empty array when the agent produced no renderable visualization.
 */
export function extractVisualizationEsql(output: ConverseLikeOutput): string[] {
  return extractVisualizations(output).map((visualization) => visualization.esql);
}

/**
 * Ordered list of tool ids invoked across the converse turn. Feeds the
 * trajectory evaluator's golden-tool-path comparison.
 */
export function getToolIds(output: ConverseLikeOutput): string[] {
  const steps = output?.steps ?? [];
  return steps
    .filter((step) => step.type === 'tool_call')
    .map((step) => (typeof step.tool_id === 'string' ? step.tool_id : ''))
    .filter(Boolean);
}
