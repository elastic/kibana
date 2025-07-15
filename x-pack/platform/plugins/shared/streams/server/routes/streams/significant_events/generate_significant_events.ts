/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { Logger } from '@kbn/core/server';
import { getLogPatterns } from '@kbn/genai-utils-server';
import { ShortIdTable, type InferenceClient } from '@kbn/inference-common';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import moment from 'moment';
import pLimit from 'p-limit';
import { v4 } from 'uuid';
import type { GeneratedSignificantEventQuery } from '@kbn/streams-schema';
import { kqlQuery, rangeQuery } from '../../internal/esql/query_helpers';
import KQL_GUIDE from './prompts/kql_guide.text';
import INSTRUCTION from './prompts/generate_queries_instruction.text';

const LOOKBACK_DAYS = 7;

export async function generateSignificantEventDefinitions({
  name,
  connectorId,
  inferenceClient,
  esClient,
  logger,
}: {
  name: string;
  connectorId: string;
  inferenceClient: InferenceClient;
  esClient: TracedElasticsearchClient;
  logger: Logger;
}): Promise<GeneratedSignificantEventQuery[]> {
  const mend = moment();
  const mstart = mend.clone().subtract(24, 'hours');

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

  const lookbackStart = mend.clone().subtract(LOOKBACK_DAYS, 'days').valueOf();

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
      
      ${logPatterns
        .map((pattern) => {
          return `- ${pattern.sample} (${pattern.count})`;
        })
        .join('\n')}
      `;
    });
  }

  const chunks = [
    INSTRUCTION,
    KQL_GUIDE,
    logPatterns
      ? `## Log patterns
The following log patterns were found over the last ${LOOKBACK_DAYS} days.
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

  logger.debug(() => {
    return `Input:
    ${chunks.filter(Boolean).join('\n\n')}`;
  });

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

  if (queries.length) {
    logger.debug(() => {
      return `Generated queries:
      
      ${queries
        .map((query) => {
          return `- ${query.kql}`;
        })
        .join('\n')}`;
    });
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
      
      ${queriesWithCounts
        .map((query) => {
          return `- ${query.kql}: ${query.count}`;
        })
        .join('\n')}`;
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
- Lookback period: ${LOOKBACK_DAYS} days
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
    
    ${selected
      .map((query) => {
        return `- ${query.kql}`;
      })
      .join('\n')}
    `;
  });

  return selected;
}
