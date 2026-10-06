/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingLangfuseExportConfig } from '@kbn/inference-tracing-config';
import { BaseInferenceSpanProcessor } from '../base_inference_span_processor';
export declare class LangfuseSpanProcessor extends BaseInferenceSpanProcessor {
  private readonly config;
  private getProjectId;
  constructor(config: InferenceTracingLangfuseExportConfig);
  processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan;
}
