/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { node, tracing } from '@elastic/opentelemetry-node/sdk';
import type { resources } from '@elastic/opentelemetry-node/sdk';
import { trace } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';

let inferenceProvider: node.NodeTracerProvider | undefined;

export const initInferenceTracerProvider = ({
  processors,
  resource,
}: {
  processors: tracing.SpanProcessor[];
  resource: resources.Resource;
}): void => {
  inferenceProvider = new node.NodeTracerProvider({
    sampler: new tracing.AlwaysOnSampler(),
    spanProcessors: processors,
    resource,
  });
};

/** Returns the dedicated inference tracer, falling back to the global one before init. */
export const getInferenceTracer = (): Tracer => {
  if (inferenceProvider) {
    return inferenceProvider.getTracer('inference');
  }
  return trace.getTracer('inference');
};

export const shutdownInferenceTracerProvider = async (): Promise<void> => {
  if (inferenceProvider) {
    await inferenceProvider.shutdown();
    inferenceProvider = undefined;
  }
};
