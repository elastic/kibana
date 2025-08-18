/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, getLogPatterns, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import type { Logger } from '@kbn/core/server';
import { ShortIdTable, type InferenceClient } from '@kbn/inference-common';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import moment from 'moment';
import pLimit from 'p-limit';
import { v4 } from 'uuid';
import { kqlQuery, rangeQuery } from '../../routes/internal/esql/query_helpers';
import INSTRUCTION from './prompts/generate_queries_instruction.text';
import KQL_GUIDE from './prompts/kql_guide.text';

const DEFAULT_SHORT_LOOKBACK = moment.duration(24, 'hours');
const DEFAULT_LONG_LOOKBACK = moment.duration(7, 'days');

export interface GeneratedSignificantEventQuery {
  title: string;
  kql: string;
}

interface Params {
  name: string;
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
    name,
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

  const analysis = await describeDataset({
    esClient: esClient.client,
    start,
    end,
    index: name,
  });

  const short = sortAndTruncateAnalyzedFields(analysis);

  const textFields = analysis.fields
    .filter((field) => field.types.includes('text'))
    .map((field) => field.name);

  const categorizationField = textFields.includes('message')
    ? 'message'
    : textFields.includes('body.text')
    ? 'body.text'
    : undefined;

  const lookbackStart = mend.clone().subtract(longLookback).valueOf();

  const logPatterns = categorizationField
    ? await getLogPatterns({
        start: lookbackStart,
        end,
        esClient,
        fields: [categorizationField],
        index: name,
        includeChanges: true,
        metadata: [],
      }).then((results) => {
        return results.map((result) => {
          const { sample, count, regex } = result;
          return { count, sample, regex };
        });
      })
    : undefined;

  if (logPatterns?.length) {
    logger.debug(() => {
      return `Found ${logPatterns?.length} log patterns:
      
      ${logPatterns.map((pattern) => `- ${pattern.sample} (${pattern.count})`).join('\n')}
      `;
    });
  }

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

  const queries = output.queries;

  if (!queries.length) {
    return [];
  }

  const limiter = pLimit(10);

  const [queriesWithCounts, totalCount] = await Promise.all([
    Promise.all(
      queries.map((query) =>
        limiter(async () => {
          return esClient
            .search('verify_query', {
              track_total_hits: true,
              index: name,
              size: 0,
              timeout: '5s',
              query: {
                bool: {
                  filter: [...kqlQuery(query.kql), ...rangeQuery(lookbackStart, end)],
                },
              },
            })
            .then((response) => ({ ...query, count: response.hits.total.value }));
        })
      )
    ),
    esClient
      .search('verify_query', {
        track_total_hits: true,
        index: name,
        size: 0,
        timeout: '5s',
      })
      .then((response) => response.hits.total.value),
  ]);

  if (queries.length) {
    logger.debug(() => {
      return `Ran queries:
      
      ${queriesWithCounts.map((query) => `- ${query.kql}: ${query.count}`).join('\n')}`;
    });
  }

  const idLookupTable = new ShortIdTable();

  const queriesWithShortIds = queriesWithCounts.map((query) => {
    const id = v4();
    return {
      id,
      shortId: idLookupTable.take(id),
      ...query,
    };
  });

  const { output: selectedQueries } = await inferenceClient.output({
    id: 'verify_kql_queries',
    connectorId,
    input: [
      INSTRUCTION,
      `You've previously generated KQL queries to identify significant operational patterns. 
I've executed those queries and obtained document counts for each. 
Now I need you to analyze these results and prioritize the most operationally relevant queries.

## Analysis Context
- Total documents in time period: ${totalCount}
- Lookback period: ${longLookback.asDays()} days
- Goal: Identify queries that provide the best signal-to-noise ratio for operational monitoring

## Queries
${JSON.stringify(
  queriesWithShortIds.map(({ shortId, kql, title, count }) => {
    return {
      id: shortId,
      kql,
      title,
      count,
    };
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

  const queriesByShortId = new Map(
    queriesWithShortIds.map(({ shortId, ...query }) => [shortId, query])
  );

  const selected = selectedQueries.queries.flatMap(({ id }) => {
    const query = queriesByShortId.get(id);
    if (!query) {
      return [];
    }
    return { title: query.title, kql: query.kql, count: query.count };
  });

  logger.debug(() => {
    return `Selected queries:
    
    ${selected.map((query) => `- ${query.kql}`).join('\n')}
    `;
  });

  return selected;
}
