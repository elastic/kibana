/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Direction } from '@kbn/evals-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { z } from '@kbn/zod/v4';
import type { EvidenceRound } from './evidence/types';

export interface TraceAccessor {
  traceId: string;
  esClient: ElasticsearchClient;
}

export interface EvaluatorContext<ReferenceData = Record<string, unknown>> {
  trace: TraceAccessor;
  round: EvidenceRound;
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

/**
 * Whether an evaluator ships with Kibana or was defined by a user. Callers act
 * on it — built-ins have no management actions — but resolution does not: a
 * persisted definition is compiled into this same shape.
 */
export type EvaluatorOrigin = 'built_in' | 'user_defined';

export interface EvaluatorDefinition<ReferenceData = Record<string, unknown>> {
  name: string;
  version: string;
  kind: 'llm' | 'code';
  origin: EvaluatorOrigin;
  description: string;
  direction: Direction;
  referenceDataSchema?: z.ZodType<ReferenceData>;
  evidenceSchema?: z.ZodType<Partial<EvidenceRound>>;
  evaluate(ctx: EvaluatorContext<ReferenceData>): Promise<EvaluatorResult>;
}

/**
 * Resolution within one space. Asynchronous because persisted definitions are
 * read from Elasticsearch, and scoped because which ones exist depends on the
 * space the caller is acting in.
 */
export interface ScopedEvaluatorRegistry {
  list(): Promise<EvaluatorDefinition[]>;
  get(name: string, version?: string): Promise<EvaluatorDefinition | undefined>;
}

export interface EvaluatorRegistry {
  /** Whether a name is taken by a built-in, and so cannot be defined by a user. */
  isBuiltIn(name: string): boolean;
  asScoped(options: { spaceId: string }): ScopedEvaluatorRegistry;
}
