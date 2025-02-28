/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnstructuredLogState } from '../../types';
import type { HandleUnstructuredNodeParams, LogResult } from './types';
import { testPipeline } from '../../util';
import { createGrokProcessor, createPassthroughFailureProcessor } from '../../util/processors';

export interface UnstructuredLogParse {
  grokPatterns: string[];
  errorsAndSamples: ErrorAndSample[];
}

export interface ErrorAndSample {
  sample: string;
  error: object;
}

export async function handleUnstructuredValidate({
  state,
  client,
}: HandleUnstructuredNodeParams): Promise<Partial<UnstructuredLogState>> {
  const currentPattern = state.currentPattern;
  const grokPatterns = state.grokPatterns;
  const grokProcessor = createGrokProcessor([currentPattern]);
  const pipeline = { processors: grokProcessor, on_failure: [createPassthroughFailureProcessor()] };

  const packageName = state.packageName;
  const dataStreamName = state.dataStreamName;
  const validSamples: LogResult[] = [];
  const errorsAndSamples: ErrorAndSample[] = [];

  for (const sample of state.logSamples) {
    const result = (await testPipeline([sample], pipeline, client)) as {
      pipelineResults: LogResult[];
      errors: object[];
    };

    if (result.errors.length > 0) {
      errorsAndSamples.push({ sample, error: result.errors[0] });
    } else {
      validSamples.push(result.pipelineResults[0]);
    }
  }

  const matchPercentage = validSamples.length / state.logSamples.length;

  if (validSamples.length > 0) {
    grokPatterns.push(currentPattern);
  }

  if (errorsAndSamples.length > 0) {
    return {
      errorsAndSamples,
      lastExecutedChain: 'unstructuredValidate',
    };
  }

  const jsonSamples = validSamples
    .map((log) => log[packageName])
    .map((log) => log[dataStreamName])
    .map((log) => JSON.stringify(log));
  const additionalProcessors = state.additionalProcessors;
  additionalProcessors.push(grokProcessor[0]);

  return {
    jsonSamples,
    additionalProcessors,
    errorsAndSamples: [],
    lastExecutedChain: 'unstructuredValidate',
  };
}
