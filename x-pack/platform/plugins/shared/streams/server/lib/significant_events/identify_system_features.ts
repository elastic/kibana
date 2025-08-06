/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { Logger } from '@kbn/core/server';
import { type InferenceClient } from '@kbn/inference-common';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import moment from 'moment';
import { Observable } from 'rxjs';

const DEFAULT_SHORT_LOOKBACK = moment.duration(24, 'hours');

interface Params {
  name: string;
  connectorId: string;
  currentDate?: Date;
  shortLookback?: moment.Duration;
}

interface Dependencies {
  inferenceClient: InferenceClient;
  esClient: TracedElasticsearchClient;
  logger: Logger;
}

export function identifySystemFeatures(
  params: Params,
  dependencies: Dependencies
): Observable<string> {
  return new Observable<string>((subscriber) => {
    (async () => {
      try {
        const {
          name,
          connectorId,
          currentDate = new Date(),
          shortLookback = DEFAULT_SHORT_LOOKBACK,
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

        logger.debug(() => {
          return `${JSON.stringify(short)}`;
        });

        const messageField = analysis.fields.find(
          (f) => f.name === 'message' || f.name === 'body.text'
        );

        const { content: systemIdentification } = await inferenceClient.output({
          id: 'identify_system',
          connectorId,
          input: `You are an expert log analysis system. Your task is to identify the system that generated these logs.

## Context
- Index Name: ${name}
${messageField ? `- Sample logs field: ${messageField.name}` : ''}

## Sample logs
${JSON.stringify(messageField?.values ?? [])}

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

        subscriber.next(systemIdentification);
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
