/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import { omit } from 'lodash';
import type { InsightCore } from '@kbn/streams-schema';
import type { Query } from '../../../../common/queries';
import { parseError } from '../../streams/errors/parse_error';
import { SecurityError } from '../../streams/errors/security_error';
import { getColumnIndex, getSourceColumnIndex, toEsqlRequest } from '../../streams/helpers/esql';
import { ALERTS_DATA_STREAM } from '../alerts_data_stream';
import { SUBMIT_INSIGHTS_TOOL_NAME, parseInsightsWithErrors } from './client/insight_tool';

export interface QueryData {
  title: string;
  esql: string;
  currentCount: number;
  sampleEvents: string[];
}

const SAMPLE_EVENTS_COUNT = 5;
const CURRENT_WINDOW_MINUTES = 15;
const SAMPLE_EVENT_MAX_CHARS = 2_000;

/**
 * Safely extracts insights from an LLM response.
 */
export function extractInsightsFromResponse(
  response: { toolCalls?: Array<{ function: { name: string; arguments: unknown } }> },
  logger: Logger
): InsightCore[] {
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
  const { rule_id: ruleId } = query;

  const now = new Date();
  const nowMinus15m = new Date(now.getTime() - CURRENT_WINDOW_MINUTES * 60 * 1000);
  const timestampCol = esql.col('@timestamp');
  const ruleUuidCol = esql.col(ALERT_RULE_UUID.split('.'));
  const fromLit = esql.str(nowMinus15m.toISOString());
  const toLit = esql.str(now.toISOString());
  const ruleIdLit = esql.str(ruleId);
  const whereCondition = esql.exp`${timestampCol} >= ${fromLit} AND ${timestampCol} <= ${toLit} AND ${ruleUuidCol} == ${ruleIdLit}`;

  let q1Response: ESQLSearchResponse;
  let q2Response: ESQLSearchResponse;
  try {
    [q1Response, q2Response] = await Promise.all([
      esClient.esql.query({
        ...toEsqlRequest(
          esql.from([ALERTS_DATA_STREAM], ['_source']).where`${whereCondition}`.limit(
            SAMPLE_EVENTS_COUNT
          )
        ),
        drop_null_columns: true,
        format: 'json',
      }) as unknown as ESQLSearchResponse,
      esClient.esql.query({
        ...toEsqlRequest(
          esql.from([ALERTS_DATA_STREAM]).where`${whereCondition}`
            .pipe`STATS currentCount = COUNT(*)`
        ),
        format: 'json',
      }) as unknown as ESQLSearchResponse,
    ]);
  } catch (err) {
    const { type, message } = parseError(err);
    if (type === 'security_exception') {
      throw new SecurityError(
        `Cannot read Significant events, insufficient privileges: ${message}`,
        { cause: err instanceof Error ? err : new Error(String(err)) }
      );
    }
    // Alerts index missing → skip this query (no events to summarise).
    // Other verification_exception flavours (unknown column, malformed query,
    // mapping regression) rethrow so they surface instead of silently
    // producing no insight data.
    if (isEsqlUnknownIndexError(err)) {
      return undefined;
    }
    throw err;
  }

  const countIdx = getColumnIndex(q2Response, 'currentCount');
  const currentCount = countIdx >= 0 ? (q2Response.values[0]?.[countIdx] as number) ?? 0 : 0;

  if (currentCount === 0) {
    return undefined;
  }

  const sourceIdx = getSourceColumnIndex(q1Response);
  const sampleEvents = q1Response.values.map((row) => {
    const source = sourceIdx >= 0 ? (row[sourceIdx] as Record<string, unknown>) ?? {} : {};
    const originalSource = (source.original_source as Record<string, unknown>) ?? {};
    const stringified = JSON.stringify(omit(originalSource, '_id'));
    return stringified.length > SAMPLE_EVENT_MAX_CHARS
      ? `${stringified.slice(0, SAMPLE_EVENT_MAX_CHARS)}…(truncated)`
      : stringified;
  });

  return {
    title: query.query.title,
    esql: query.query.esql.query,
    currentCount,
    sampleEvents,
  };
}
