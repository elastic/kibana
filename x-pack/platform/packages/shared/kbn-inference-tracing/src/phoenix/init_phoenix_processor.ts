/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LateBindingSpanProcessor } from '@kbn/tracing';
import { InferenceTracingPhoenixExportConfig } from '@kbn/inference-common';
import { Logger } from '@kbn/core/server';
import { PhoenixSpanProcessor } from './phoenix_span_processor';

export function initPhoenixProcessor({
  logger,
  config,
}: {
  logger: Logger;
  config: InferenceTracingPhoenixExportConfig;
}): () => Promise<void> {
  const processor = new PhoenixSpanProcessor(logger, config);

  return LateBindingSpanProcessor.register(processor);
}
