/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { type InferenceClient } from '@kbn/inference-common';
import { type GeneratedSignificantEventQuery, type Streams } from '@kbn/streams-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import moment from 'moment';
import { analyzeDataset } from './helpers/analyze_dataset';
import { assignShortIds } from './helpers/assign_short_ids';
import { getLogPatterns } from './helpers/get_log_patterns';
import { verifyQueries } from './helpers/verify_queries';
import INSTRUCTION from './prompts/generate_queries_instruction.text';
import KQL_GUIDE from './prompts/kql_guide.text';

const DEFAULT_SHORT_LOOKBACK = moment.duration(24, 'hours');
const DEFAULT_LONG_LOOKBACK = moment.duration(7, 'days');

interface Params {
  definition: Streams.all.Definition;
  connectorId: string;
  currentDate?: Date;
  shortLookback?: moment.Duration;
  longLookback?: moment.Duration;
}

interface Dependencies {
  inferenceClient: InferenceClient;
  esClient: TracedElasticsearchClient;
  logger: Logger;
}

export async function generateSignificantEventDefinitions(
  params: Params,
  dependencies: Dependencies
): Promise<GeneratedSignificantEventQuery[]> {
  const {
    definition,
    connectorId,
    currentDate = new Date(),
    shortLookback = DEFAULT_SHORT_LOOKBACK,
    longLookback = DEFAULT_LONG_LOOKBACK,
  } = params;
  const { inferenceClient, esClient, logger } = dependencies;

  const mend = moment(currentDate);
  const mstart = mend.clone().subtract(shortLookback);

  const start = mstart.valueOf();
  const end = mend.valueOf();

  const lookbackStart = mend.clone().subtract(longLookback).valueOf();

  const { categorizationField, short } = await analyzeDataset(
    { start, end, definition },
    { esClient }
  );

  const logPatterns = await getLogPatterns(
    { categorizationField, lookbackStart, end, definition },
    { esClient, logger }
  );

  const chunks = [
    INSTRUCTION,
    KQL_GUIDE,
    logPatterns
      ? `## Log patterns
The following log patterns were found over the last ${longLookback.asDays()} days.
The field used is \`${categorizationField}\`:
    
${JSON.stringify(
  logPatterns.map((pattern) => {
    const { regex, count } = pattern;
    return {
      regex,
      count,
    };
  })
)}
    `
      : '',
    `## Dataset analysis
Following is the list of fields found in the dataset with their types, count and values:

${JSON.stringify(short)}
    `,
    `Remember: The goal is to create a focused set of queries that help operators 
quickly identify when something unusual or problematic is happening in the system.
Quality over quantity - aim for queries that have high signal-to-noise ratio.
    `,
  ];

  const { output } = await inferenceClient.output({
    id: 'generate_kql_queries',
    connectorId,
    input: chunks.filter(Boolean).join('\n\n'),
    schema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'A title for the log pattern',
              },
              kql: {
                type: 'string',
                description: 'The KQL of the specific log pattern',
              },
            },
            required: ['kql', 'title'],
          },
        },
      },
      required: ['queries'],
    } as const,
  });

  const verifiedQueries = await verifyQueries(
    { queries: output.queries, definition, start, end },
    { esClient, logger }
  );

  const { queriesWithShortIds, queriesByShortId } = assignShortIds(verifiedQueries);

  const { output: selectedQueries } = await inferenceClient.output({
    id: 'verify_kql_queries',
    connectorId,
    input: [
      INSTRUCTION,
      `You've previously generated KQL queries to identify significant operational patterns. 
I've executed those queries and obtained document counts for each. 
Now I need you to analyze these results and prioritize the most operationally relevant queries.

## Analysis Context
- Total documents in time period: ${verifiedQueries.totalCount}
- Lookback period: ${longLookback.asDays()} days
- Goal: Identify queries that provide the best signal-to-noise ratio for operational monitoring

## Queries
${JSON.stringify(
  queriesWithShortIds.map(({ shortId, kql, title, count }) => {
    return { id: shortId, kql, title, count };
  })
)}`,
    ].join('\n\n'),
    schema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
            },
            required: ['id'],
          },
        },
      },
      required: ['queries'],
    } as const,
  });

  const selected = selectedQueries.queries.flatMap(({ id }) => {
    const query = queriesByShortId.get(id);
    if (!query) {
      return [];
    }

    return { title: query.title, kql: query.kql, count: query.count };
  });

  logger.debug(() => {
    return `Selected queries: ${selected.map((query) => `- ${query.kql}`).join('\n')}`;
  });

  return selected;
}
