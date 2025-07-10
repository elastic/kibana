/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { highlightPatternFromRegex, ShortIdTable } from '@kbn/genai-utils-common';
import {
  analyzeDocuments,
  getLogPatterns,
  sortAndTruncateAnalyzedFields,
} from '@kbn/genai-utils-server';
import type { InferenceClient } from '@kbn/inference-common';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import moment from 'moment';
import pLimit from 'p-limit';
import { v4 } from 'uuid';
import { kqlQuery, rangeQuery } from '../../internal/esql/query_helpers';
import { KQL_GUIDE } from './kql_guide';
import { mapValues, sampleSize } from 'lodash';

const LOOKBACK_DAYS = 7;

export interface GeneratedSignificantEventQuery {
  title: string;
  kql: string;
}

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

  const analysis = await analyzeDocuments({
    esClient,
    kuery: '',
    start,
    end,
    index: name,
  });

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
        kuery: '',
        includeChanges: true,
        metadata: [],
      }).then((results) => {
        return results.map((result) => {
          const { sample, count, regex } = result;
          return {
            count,
            highlight: highlightPatternFromRegex(regex, sample),
            sample,
            regex,
          };
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

  const short = sortAndTruncateAnalyzedFields(analysis);

  const instruction = `
I want to generate KQL queries that help me find
important log messages. Each pattern should have its own
query. I will use these queries to help me see changes in
these patterns. Only generate queries for patterns that
are indicative of something unusual happening, like startup/
shutdown messages, or warnings, errors and fatal messages. Prefer
simple match queries over wildcards. The goal of this is to have
queries that each represent a specific pattern, to be able to
monitor for changes in the pattern and use it as a signal in
root cause analysis. Some example of patterns:

- \`message: "CircuitBreakingException"\`
- \`message: "max number of clients reached"\`
- \`message: "Unable to connect * Connection refused"\`
`;

  const chunks = [
    instruction,
    KQL_GUIDE,
    logPatterns
      ? `## Log patterns
    
    The following log patterns were found over the last
    ${LOOKBACK_DAYS} days. The field used is \`${categorizationField}\`:
    
    ${JSON.stringify(
      logPatterns.map((pattern) => {
        const { regex, count } = pattern;
        return {
          regex,
          count,
        };
      })
    )}`
      : '',
    `## Dataset analysis
    
    ${JSON.stringify(short)}`,
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
      instruction,
      `You've previously generated some queries. I've ran those queries
      to get the count for each. The total count of documents for the
      given time period is ${totalCount}. Based on these document counts,
      select the queries that you consider relevant.
      
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
      )}
      `,
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

  const messageFields = analysis.fields.find((f) => f.name === 'message' || f.name === 'body.text');

  const { content: systemIdentification } = await inferenceClient.output({
    id: 'identify_system',
    connectorId,
    input: `
You are an expert log analysis system. Your task is to identify the system that generated these logs.

## Context
- Index Name: ${name}
- Time Range: Last 24 hours
- Total Document Count: ${analysis.total}

## Sample Log Documents

${JSON.stringify(messageFields?.values ?? [])}

## Dataset analysis
    
${JSON.stringify(short)}

## Task: System Identification

Based on the log samples above, identify:
1. **Primary System/Application**: What system generated these logs? (e.g., Nginx, Apache, Kubernetes, AWS CloudTrail, Spring Boot application, etc.)
2. **System Version** (if detectable): Can you identify the specific version or variant?
3. **Confidence Level**: Rate your confidence in this identification (High/Medium/Low) and explain why.

Please structure your response as plain text for usage in another LLM prompt
`,
  });

  logger.debug(() => `identified system: ${JSON.stringify(systemIdentification)}`);

  const { output: zeroShotQueries } = await inferenceClient.output({
    id: 'generate_queries_from_system',
    connectorId,
    input: `
You are an expert log analysis system. You previously identified the system that generated the logs as {identified_system}.

## Identified System

${JSON.stringify(systemIdentification)}

## Context
- Index Name: ${name}
- Time Range: Last 24 hours
- Total Document Count: ${analysis.total}
- Field name: ${messageFields?.name ?? 'message'}

## Dataset analysis
    
${JSON.stringify(short)}

${KQL_GUIDE}

Based on your identification of this as a {identified_system} system, generate Elasticsearch KQL queries to detect the most significant events for this type of system. 

For each query, provide:
- **Query Title**: A title for the log pattern
- **KQL**: The KQL of the specific log pattern

Focus on queries that would detect:
1. **Critical Errors**: System failures, crashes, or critical errors specific to {identified_system}
2. **Security Events**: Authentication failures, unauthorized access, suspicious patterns
3. **Performance Issues**: Slow responses, timeouts, resource exhaustion
4. **Availability Issues**: Service disruptions, connectivity problems
5. **Data Integrity**: Corruption, failed transactions, data loss indicators
6. **Anomalous Behavior**: Unusual patterns specific to {identified_system}
`,
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

  logger.debug(() => `identified system: ${JSON.stringify(zeroShotQueries)}`);

  return [...selected, ...zeroShotQueries.queries];
}
