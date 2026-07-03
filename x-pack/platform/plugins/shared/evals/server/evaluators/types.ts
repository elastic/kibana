/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { z } from '@kbn/zod/v4';

export interface TraceAccessor {
  traceId: string;
  esClient: ElasticsearchClient;
}

export interface EvaluatorContext<ReferenceData = Record<string, unknown>> {
  trace: TraceAccessor;
  referenceData?: ReferenceData;
  inferenceClient?: BoundInferenceClient;
  log: Logger;
}

export interface EvaluatorResult {
  scores: Array<{
    name: string;
    score?: number | null;
    label?: string;
    explanation?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface EvaluatorDefinition<ReferenceData = Record<string, unknown>> {
  name: string;
  version: string;
  kind: 'llm' | 'code';
  description: string;
  referenceDataSchema?: z.ZodType<ReferenceData>;
  evaluate(ctx: EvaluatorContext<ReferenceData>): Promise<EvaluatorResult>;
}

export interface EvaluatorRegistry {
  list(): EvaluatorDefinition[];
  get(name: string, version?: string): EvaluatorDefinition | undefined;
}
