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
  unParsedSamples: string[];
}

export async function handleUnstructuredValidate({
  state,
  client,
}: HandleUnstructuredNodeParams): Promise<Partial<UnstructuredLogState>> {
  const currentPattern = state.currentPattern;
  const grokPatterns = state.grokPatterns;
  const grokProcessor = createGrokProcessor([...grokPatterns, currentPattern]);
  const pipeline = {
    processors: [grokProcessor],
    on_failure: [createPassthroughFailureProcessor()],
  };

  const packageName = state.packageName;
  const dataStreamName = state.dataStreamName;
  const validSamples: LogResult[] = [];
  const unParsedSamples: string[] = [];
  const errors: object[] = [];

  for (const sample of state.logSamples) {
    const result = (await testPipeline([sample], pipeline, client)) as {
      pipelineResults: LogResult[];
      errors: object[];
    };

    if (result.errors.length > 0) {
      unParsedSamples.push(sample);
      errors.push(result.errors[0]);
    } else {
      validSamples.push(result.pipelineResults[0]);
    }
  }

  if (validSamples.length > 0) {
    grokPatterns.push(currentPattern);
  }

  if (unParsedSamples.length > 0) {
    return {
      unParsedSamples,
      errors,
      lastExecutedChain: 'unstructuredValidate',
    };
  }

  const jsonSamples = validSamples
    .map((log) => log[packageName])
    .map((log) => log[dataStreamName])
    .map((log) => JSON.stringify(log));
  const additionalProcessors = state.additionalProcessors;
  additionalProcessors.push(grokProcessor);

  return {
    jsonSamples,
    additionalProcessors,
    unParsedSamples: [],
    lastExecutedChain: 'unstructuredValidate',
  };
}
