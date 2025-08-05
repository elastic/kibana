/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { Logger } from '@kbn/core/server';
import { type InferenceClient } from '@kbn/inference-common';
import type { GeneratedSignificantEventQuery } from '@kbn/streams-schema';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import moment from 'moment';
import { Observable } from 'rxjs';
import KQL_GUIDE from './prompts/kql_guide.text';

const DEFAULT_SHORT_LOOKBACK = moment.duration(24, 'hours');
const DEFAULT_LONG_LOOKBACK = moment.duration(7, 'days');

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

export function generateUsingZeroShot(
  params: Params,
  dependencies: Dependencies
): Observable<GeneratedSignificantEventQuery[]> {
  return new Observable<GeneratedSignificantEventQuery[]>((subscriber) => {
    (async () => {
      try {
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

        const messageField = analysis.fields.find(
          (f) => f.name === 'message' || f.name === 'body.text'
        );

        if (!messageField) {
          return;
        }

        logger.debug(() => {
          return `${JSON.stringify(short)}`;
        });

        const { content: systemIdentification } = await inferenceClient.output({
          id: 'identify_system',
          connectorId,
          input: `You are an expert log analysis system. Your task is to identify the system that generated these logs.

## Context
- Index Name: ${name}
- Total Document Count: ${analysis.total}
- Sample logs field: ${messageField.name}

## Sample logs
${JSON.stringify(messageField.values ?? [])}

## Dataset analysis
Following is the list of fields found in the dataset with their types, count and values:
${JSON.stringify(short)}

## Task: System Identification

Based on the log samples above, the dataset analysis and the context, identify:
1. **Primary System/Application**: What system generated these logs? (e.g., Nginx, Apache, Kubernetes, AWS CloudTrail, Spring Boot application, etc.)
2. **System Version** (if detectable): Can you identify the specific version or variant?
3. **Confidence Level**: Rate your confidence in this identification (High/Medium/Low) and explain why.

Please structure your response as plain text for usage in another LLM prompt`,
        });

        const { output: zeroShotQueries } = await inferenceClient.output({
          id: 'generate_queries_from_system',
          connectorId,
          input: `You are an expert log analysis system. You previously identified the system that generated the logs as {identified_system}.

## Identified System
${JSON.stringify(systemIdentification)}

## Context
- Index Name: ${name}
- Total Document Count: ${analysis.total}
- Sample logs field: ${messageField.name}

## Dataset analysis
Following is the list of fields found in the dataset with their types, count and values:
${JSON.stringify(short)}

${KQL_GUIDE}

## Task: Generate Significant Event Queries

Based on your identification of this as a {identified_system} system, generate Elasticsearch KQL queries
to detect the most significant events for this type of system using exclusively the following field in the KQL query:
${messageField.name}

Generate KQL queries that identify **operationally significant patterns** - events that indicate:
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

        subscriber.next(zeroShotQueries.queries);
      } catch (error) {
        subscriber.error(error);
      } finally {
        subscriber.complete();
      }
    })().catch((error) => {
      subscriber.error(error);
    });
  });
}
