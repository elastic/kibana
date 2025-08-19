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
import { isEmpty } from 'lodash';
import moment from 'moment';
import { isKqlQueryValid } from '../../routes/internal/esql/query_helpers';
import { analyzeDataset } from './helpers/analyze_dataset';
import KQL_GUIDE from './prompts/kql_guide.text';

const DEFAULT_SHORT_LOOKBACK = moment.duration(24, 'hours');

interface Params {
  definition: Streams.all.Definition;
  connectorId: string;
  currentDate?: Date;
  shortLookback?: moment.Duration;
}

interface Dependencies {
  inferenceClient: InferenceClient;
  esClient: TracedElasticsearchClient;
  logger: Logger;
}

export async function generateSignificantEventQueriesUsingDescription(
  params: Params,
  dependencies: Dependencies
): Promise<GeneratedSignificantEventQuery[]> {
  const {
    definition,
    connectorId,
    currentDate = new Date(),
    shortLookback = DEFAULT_SHORT_LOOKBACK,
  } = params;
  const { inferenceClient, esClient } = dependencies;

  const identifiedSystem = definition.description;
  if (isEmpty(identifiedSystem)) {
    return [];
  }

  const mend = moment(currentDate);
  const mstart = mend.clone().subtract(shortLookback);

  const start = mstart.valueOf();
  const end = mend.valueOf();

  const { categorizationField, short } = await analyzeDataset(
    { start, end, definition },
    { esClient }
  );

  if (!categorizationField) {
    return [];
  }

  const { output: zeroShotQueries } = await inferenceClient.output({
    id: 'generate_queries_from_system',
    connectorId,
    input: `You are an expert log analyst tasked with generating KQL (Kibana Query Language) queries to identify significant events for the {{identified_system}}.


## {{identified_system}}
You previously identified the system that generated the logs as:
${identifiedSystem}

## Context
- Index Name: ${definition.name}
- Sample logs field: ${categorizationField}

## Dataset analysis
Following is the list of fields found in the dataset with their types, count and values:
${JSON.stringify(short)}

${KQL_GUIDE}

## Task: Generate Significant Event Queries

Based on your deep expertise of the {{identified_system}}, generate Elasticsearch KQL (Kibana Query Language) queries using the {{kql_guide}} 
to detect the most significant events for this type of system using the following field in the KQL query: ${categorizationField}.

Generate KQL queries that identify **operationally significant patterns** - events that indicate:
1. **Critical Errors**: System failures, crashes, or critical errors specific to {{identified_system}}
2. **Security Events**: Authentication failures, unauthorized access, suspicious patterns
3. **Performance Issues**: Slow responses, timeouts, resource exhaustion
4. **Availability Issues**: Service disruptions, connectivity problems
5. **Data Integrity**: Corruption, failed transactions, data loss indicators
6. **Anomalous Behavior**: Unusual patterns specific to {{identified_system}}

Remember to focus exclusively on queries that are specific to the {{identified_system}} and follow the {{kql_guide}}.
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
                description: 'A title for the significant event query',
              },
              kql: {
                type: 'string',
                description: 'The KQL of the specific significant event query',
              },
            },
            required: ['kql', 'title'],
          },
        },
      },
      required: ['queries'],
    } as const,
  });

  return zeroShotQueries.queries.filter((query) => isKqlQueryValid(query.kql));
}
