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
import type { EvidenceRound, TranscriptMessage } from './evidence/types';

export interface TraceAccessor {
  traceId: string;
  esClient: ElasticsearchClient;
}

export interface EvaluatorContext<ReferenceData = Record<string, unknown>> {
  /** Absent when the round was passed in memory rather than read from a trace. */
  trace?: TraceAccessor;
  round: EvidenceRound;
  referenceData?: ReferenceData;
  /** The whole conversation, when the caller passed one with in-memory evidence. */
  transcript?: TranscriptMessage[];
  /** Evaluator-specific inputs passed with in-memory evidence, checked against `contextSchema`. */
  context?: Record<string, unknown>;
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
    /** Overrides the evaluator's `direction` for this score alone. */
    direction?: Direction;
  }>;
}

/**
 * Whether an evaluator ships with Kibana or was defined by a user. Callers act
 * on it — built-ins have no management actions — but resolution does not: a
 * persisted definition is compiled into this same shape.
 */
export type EvaluatorOrigin = 'built_in' | 'user_defined';

/**
 * An evaluator as a plugin registers it. The registry marks it `built_in`, so it resolves in
 * every space and its name is reserved.
 */
export interface RegisteredEvaluatorDefinition<ReferenceData = Record<string, unknown>> {
  /** Follows the same rules as a user-defined evaluator's name. */
  name: string;
  /** A semver version. */
  version: string;
  kind: 'llm' | 'code';
  description: string;
  direction: Direction;
  referenceDataSchema?: z.ZodType<ReferenceData>;
  /**
   * Inputs the evaluator needs beyond the round and reference data, such as a decision tree.
   * An evaluation whose `context` doesn't match is refused before any evaluator runs.
   */
  contextSchema?: z.ZodType<Record<string, unknown>>;
  evidenceSchema?: z.ZodType<Partial<EvidenceRound>>;
  evaluate(ctx: EvaluatorContext<ReferenceData>): Promise<EvaluatorResult>;
}

export interface EvaluatorDefinition<ReferenceData = Record<string, unknown>>
  extends RegisteredEvaluatorDefinition<ReferenceData> {
  origin: EvaluatorOrigin;
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
  /**
   * Adds a plugin-owned evaluator next to the ones Kibana ships. Throws for an invalid name
   * or version, a name Kibana ships, or a name and version already registered.
   */
  register(definition: RegisteredEvaluatorDefinition): void;
}
