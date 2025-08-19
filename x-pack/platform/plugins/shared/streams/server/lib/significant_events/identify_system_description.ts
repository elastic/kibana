/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { type InferenceClient } from '@kbn/inference-common';
import type { Streams } from '@kbn/streams-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import moment from 'moment';
import { analyzeDataset } from './helpers/analyze_dataset';

const DEFAULT_SHORT_LOOKBACK = moment.duration(24, 'hours');

interface Params {
  name: string;
  connectorId: string;
  currentDate?: Date;
  shortLookback?: moment.Duration;
  definition: Streams.all.Definition;
}

interface Dependencies {
  inferenceClient: InferenceClient;
  esClient: TracedElasticsearchClient;
  logger: Logger;
}

export async function identifySystemDescription(
  params: Params,
  dependencies: Dependencies
): Promise<string> {
  const {
    name,
    connectorId,
    currentDate = new Date(),
    shortLookback = DEFAULT_SHORT_LOOKBACK,
    definition,
  } = params;
  const { inferenceClient, esClient } = dependencies;

  const mend = moment(currentDate);
  const mstart = mend.clone().subtract(shortLookback);

  const start = mstart.valueOf();
  const end = mend.valueOf();

  const { analysis, categorizationField, short } = await analyzeDataset(
    { start, end, definition },
    { esClient }
  );

  const messageField = analysis.fields.find((f) => f.name === categorizationField);

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

  return systemIdentification;
}
