/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { Logger } from '@kbn/core/server';
import { type InferenceClient } from '@kbn/inference-common';
import {
  getIndexPatternsForStream,
  type GeneratedSignificantEventQuery,
  type Streams,
} from '@kbn/streams-schema';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import moment from 'moment';
import { Observable } from 'rxjs';
import type { AssetClient } from '../streams/assets/asset_client';
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
  assetClient: AssetClient;
}

export function generateUsingZeroShot(
  params: Params,
  dependencies: Dependencies
): Observable<GeneratedSignificantEventQuery[]> {
  return new Observable<GeneratedSignificantEventQuery[]>((subscriber) => {
    (async () => {
      try {
        const {
          definition,
          connectorId,
          currentDate = new Date(),
          shortLookback = DEFAULT_SHORT_LOOKBACK,
        } = params;
        const { inferenceClient, esClient, logger, assetClient } = dependencies;

        const features = await assetClient.bulkGetByIds(definition.name, 'feature', [
          'identified_system',
        ]);
        const identifiedSystem = features[0]?.feature.feature;

        if (!identifiedSystem) {
          return;
        }

        const mend = moment(currentDate);
        const mstart = mend.clone().subtract(shortLookback);

        const start = mstart.valueOf();
        const end = mend.valueOf();

        const analysis = await describeDataset({
          esClient: esClient.client,
          start,
          end,
          index: getIndexPatternsForStream(definition),
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

        const { output: zeroShotQueries } = await inferenceClient.output({
          id: 'generate_queries_from_system',
          connectorId,
          input: `You are an expert log analysis system. You previously identified the system that generated the logs as {identified_system}.

## Identified System
${JSON.stringify(identifiedSystem)}

## Context
- Index Name: ${name}
- Sample logs field: ${messageField.name}

## Dataset analysis
Following is the list of fields found in the dataset with their types, count and values:
${JSON.stringify(short)}

${KQL_GUIDE}

## Task: Generate Significant Event Queries

Based on your deep expertise of the identified system, generate Elasticsearch KQL queries
to detect the most significant events for this type of system using exclusively the following field in the KQL query:
${messageField.name}

Generate KQL queries that identify **operationally significant patterns** - events that indicate:
1. **Critical Errors**: System failures, crashes, or critical errors specific to {identified_system}
2. **Security Events**: Authentication failures, unauthorized access, suspicious patterns
3. **Performance Issues**: Slow responses, timeouts, resource exhaustion
4. **Availability Issues**: Service disruptions, connectivity problems
5. **Data Integrity**: Corruption, failed transactions, data loss indicators
6. **Anomalous Behavior**: Unusual patterns specific to {identified_system}

Remember to focus exclusively on queries that are specific to the identified system.
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
