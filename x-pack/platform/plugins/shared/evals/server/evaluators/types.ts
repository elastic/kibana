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

/**
 * Normalized LLM-judge evidence reconstructed from a trace. The field names are
 * the question/answer analogues the judge prompts expect, regardless of whether
 * the trace is a conversation (`gen_ai.user.message` / `gen_ai.choice`) or a
 * bare tool execution (`execute_tool` span's `gen_ai.tool.call.arguments` /
 * `gen_ai.tool.call.result`).
 */
export interface TraceEvidence {
  user_query: string;
  agent_response: string;
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
  /**
   * Whether this evaluator reads chat evidence (the user message / agent response
   * span events from `logs-*`). When true, the evaluate route waits for that
   * evidence to be exported (`awaitTraceReady`) before grading. Trace-metric
   * evaluators (tokens, latency, tool calls) do not read chat evidence and must
   * not gate on it — those columns only exist for chat/agent traces, so requiring
   * them would fail a token-only evaluation on a non-chat trace.
   */
  requiresChatEvidence?: boolean;
  evaluate(ctx: EvaluatorContext<ReferenceData>): Promise<EvaluatorResult>;
}

export interface EvaluatorRegistry {
  list(): EvaluatorDefinition[];
  get(name: string, version?: string): EvaluatorDefinition | undefined;
}
