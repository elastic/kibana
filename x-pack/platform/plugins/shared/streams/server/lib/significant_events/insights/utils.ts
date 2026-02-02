/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Condition } from '@kbn/streamlang';
import type { Insight } from '@kbn/streams-schema';
import type { Query } from '../../../../common/queries';
import { getRuleIdFromQueryLink } from '../../streams/assets/query/helpers/query';
import { SUBMIT_INSIGHTS_TOOL_NAME, parseInsightsWithErrors } from './schema';
import { fetchAlertSampleDocuments } from './sample_documents';

export interface QueryData {
  title: string;
  kql: string;
  feature?: {
    name: string;
    filter: Condition;
  };
  currentCount: number;
  sampleEvents: string[];
}

/**
 * Query data enriched with change detection information.
 * Used by the change-filtered pipeline.
 */
export interface EnrichedQueryData extends QueryData {
  /** Percentage change detected (positive = increase, negative = decrease) */
  percentageChange: number;
  /** Type of change detected (e.g., 'spike', 'dip', 'step_change') */
  changeType?: string;
}

const SAMPLE_EVENTS_COUNT = 5;
const CURRENT_WINDOW_MINUTES = 15;

/**
 * Safely extracts insights from an LLM response.
 */
export function extractInsightsFromResponse(
  response: { toolCalls?: Array<{ function: { name: string; arguments: unknown } }> },
  logger: Logger
): Insight[] {
  if (!response.toolCalls || response.toolCalls.length === 0) {
    logger.warn('LLM response has no tool calls');
    return [];
  }

  const toolCall = response.toolCalls.find((tc) => tc.function?.name === SUBMIT_INSIGHTS_TOOL_NAME);

  if (!toolCall || !toolCall.function?.arguments) {
    logger.warn(`${SUBMIT_INSIGHTS_TOOL_NAME} tool call missing arguments`);
    return [];
  }

  const { insights, errors: validationErrors } = parseInsightsWithErrors(
    toolCall.function.arguments
  );

  if (validationErrors) {
    logger.warn(`Insights validation failed: ${validationErrors.message}`);
  }

  return insights;
}

export async function collectQueryData({
  query,
  esClient,
}: {
  query: Query;
  esClient: ElasticsearchClient;
}): Promise<QueryData | undefined> {
  const ruleId = getRuleIdFromQueryLink(query);

  // Use shared sample documents abstraction
  const now = new Date();
  const from = new Date(now.getTime() - CURRENT_WINDOW_MINUTES * 60 * 1000);

  const { documents, totalCount } = await fetchAlertSampleDocuments(
    ruleId,
    from,
    now,
    esClient,
    { size: SAMPLE_EVENTS_COUNT }
  );

  if (totalCount === 0) {
    return undefined;
  }

  const sampleEvents = documents.map((doc) => JSON.stringify(doc));

  return {
    title: query.query.title,
    kql: query.query.kql.query,
    feature: query.query.feature
      ? { name: query.query.feature.name, filter: query.query.feature.filter }
      : undefined,
    currentCount: totalCount,
    sampleEvents,
  };
}
