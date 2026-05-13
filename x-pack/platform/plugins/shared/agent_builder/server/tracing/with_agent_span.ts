/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context, Span } from '@opentelemetry/api';
import { safeJsonStringify } from '@kbn/std';
import { ElasticGenAIAttributes, GenAISemanticConventions } from '@kbn/inference-tracing';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { AgentHandlerReturn } from '@kbn/agent-builder-server';
import { withExplicitSpan } from './with_explicit_span';
import { getAgentBuilderTracer } from './register_tracing';

interface WithAgentSpanOptions {
  agent: AgentDefinition;
}

export function withAgentSpan(
  { agent }: WithAgentSpanOptions,
  parentCtx: Context,
  cb: (span: Span | undefined, ctx: Context) => Promise<AgentHandlerReturn>
): Promise<AgentHandlerReturn> {
  const { id: agentId, configuration } = agent;
  const tracer = getAgentBuilderTracer();
  if (!tracer) {
    return cb(undefined, parentCtx);
  }
  return withExplicitSpan(
    tracer,
    'ExecuteAgent',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'AGENT',
        [ElasticGenAIAttributes.AgentId]: agentId,
        [GenAISemanticConventions.GenAIAgentId]: agentId,
        [ElasticGenAIAttributes.AgentConfig]: safeJsonStringify(configuration),
      },
    },
    parentCtx,
    (span, ctx) => {
      return cb(span, ctx).then((agentReturn) => {
        span.setAttribute('output.value', safeJsonStringify(agentReturn) ?? 'unknown');
        return agentReturn;
      });
    }
  );
}
