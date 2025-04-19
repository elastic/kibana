/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DelegateSpanProcessor } from '@kbn/tracing';
import { InferenceTracingLangfuseExportConfig } from '@kbn/inference-common';
import { Logger } from '@kbn/core/server';
import { LangfuseSpanProcessor } from './langfuse_span_processor';

export function initLangfuseProcessor({
  logger,
  config,
}: {
  logger: Logger;
  config: InferenceTracingLangfuseExportConfig;
}): () => Promise<void> {
  const processor = new LangfuseSpanProcessor(logger, config);

  return DelegateSpanProcessor.register(processor);
}
