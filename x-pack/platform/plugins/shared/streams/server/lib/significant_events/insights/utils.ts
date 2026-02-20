/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { omit } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import type { Insight } from '@kbn/streams-schema';
import type { Query } from '../../../../common/queries';
import { getRuleIdFromQueryLink } from '../../streams/assets/query/helpers/query';
import { parseError } from '../../streams/errors/parse_error';
import { SecurityError } from '../../streams/errors/security_error';
import { SUBMIT_INSIGHTS_TOOL_NAME, parseInsightsWithErrors } from './schema';

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

  const currentResponse = await esClient
    .search<{ original_source: Record<string, unknown> }>({
      index: '.alerts-streams.alerts-default',
      size: SAMPLE_EVENTS_COUNT,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: `now-${CURRENT_WINDOW_MINUTES}m`,
                  lte: 'now',
                },
              },
            },
            {
              term: {
                'kibana.alert.rule.uuid': ruleId,
              },
            },
          ],
        },
      },
      track_total_hits: true,
    })
    .catch((err) => {
      const { type, message } = parseError(err);
      if (type === 'security_exception') {
        throw new SecurityError(
          `Cannot read Significant events, insufficient privileges: ${message}`,
          { cause: err }
        );
      }
      throw err;
    });

  const currentCount =
    typeof currentResponse.hits.total === 'number'
      ? currentResponse.hits.total
      : currentResponse.hits.total?.value ?? 0;

  if (currentCount === 0) {
    return undefined;
  }

  const sampleEvents = currentResponse.hits.hits.map((hit) =>
    JSON.stringify(omit(hit._source?.original_source ?? {}, '_id'))
  );

  return {
    title: query.query.title,
    kql: query.query.kql.query,
    feature: query.query.feature
      ? { name: query.query.feature.name, filter: query.query.feature.filter }
      : undefined,
    currentCount,
    sampleEvents,
  };
}
