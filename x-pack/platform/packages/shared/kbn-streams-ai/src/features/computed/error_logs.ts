/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSampleDocumentsEsql, DEFAULT_ESQL_QUERY_TIMEOUT_MS } from '@kbn/ai-tools';
import { esql } from '@elastic/esql';
import { getStreamSamplingSource } from '@kbn/streams-schema';
import { ERROR_LOGS_FEATURE_TYPE } from '@kbn/significant-events-schema';
import { compact } from 'lodash';
import type { ComputedFeatureGenerator } from './types';
import { formatRawDocument } from '../utils/format_raw_document';

const SAMPLE_SIZE = 5;
const LOG_MESSAGE_FIELDS = ['message', 'body.text'] as const;
const ERROR_KEYWORDS = ['error', 'exception'] as const;

const ERROR_LOG_KEEP_FIELDS_LIST = [
  '@timestamp',
  ...LOG_MESSAGE_FIELDS,
  'log.level',
  'severity_text',
  'severity_number',
  'error.type',
  'error.message',
  'exception.type',
  'exception.message',
  'event.outcome',
  'service.name',
] as const;

const ERROR_LOG_KEEP_FIELDS = new Set<string>(ERROR_LOG_KEEP_FIELDS_LIST);

const OTEL_FIELD_PREFIX = /^(?:resource\.)?attributes\./;

export const pickErrorLogFields = (fields: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (ERROR_LOG_KEEP_FIELDS.has(key.replace(OTEL_FIELD_PREFIX, ''))) {
      result[key] = value;
    }
  }
  return result;
};

// QSTR: log.level is union-typed on some streams; ::keyword cast fixes verification but kills OR pushdown. QSTR resolves per-shard, avoiding both.
const ERROR_QUERY_STRING = [
  'log.level:error',
  ...LOG_MESSAGE_FIELDS.flatMap((field) => ERROR_KEYWORDS.map((keyword) => `${field}:${keyword}`)),
].join(' OR ');

const ERROR_WHERE_CONDITION = esql.exp`QSTR(${esql.str(ERROR_QUERY_STRING)})`;

export const errorLogsGenerator: ComputedFeatureGenerator = {
  type: ERROR_LOGS_FEATURE_TYPE,

  description: 'Sample error logs extracted from the stream',

  llmInstructions: `Contains sample error logs from the stream, filtered by log.level: error or messages containing error/exception keywords.
Use the \`properties.samples\` array to see actual error log entries.
This is useful for understanding error patterns, identifying recurring issues, and diagnosing problems in the system.`,

  generate: async ({ stream, start, end, esClient }) => {
    const { hits } = await getSampleDocumentsEsql({
      esClient,
      index: getStreamSamplingSource(stream),
      start,
      end,
      sampleSize: SAMPLE_SIZE,
      whereCondition: ERROR_WHERE_CONDITION,
      requestTimeout: DEFAULT_ESQL_QUERY_TIMEOUT_MS,
    });

    return {
      samples: compact(
        hits.map((hit) => {
          const fields = formatRawDocument({
            hit,
            priorityFields: ERROR_LOG_KEEP_FIELDS_LIST,
          })?.fields;
          return fields ? pickErrorLogFields(fields) : undefined;
        })
      ),
    };
  },
};
