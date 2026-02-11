/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from '@opentelemetry/api';
import { safeJsonStringify } from '@kbn/std';
import {
  withActiveInferenceSpan,
  ElasticGenAIAttributes,
  GenAISemanticConventions,
} from '@kbn/inference-tracing';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { AgentHandlerReturn } from '@kbn/agent-builder-server';

interface WithAgentSpanOptions {
  agent: AgentDefinition;
}

export function withAgentSpan(
  { agent }: WithAgentSpanOptions,
  cb: (span?: Span) => Promise<AgentHandlerReturn>
): Promise<AgentHandlerReturn> {
  const { id: agentId, configuration } = agent;
  return withActiveInferenceSpan(
    'ExecuteAgent',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'AGENT',
        [ElasticGenAIAttributes.AgentId]: agentId,
        [GenAISemanticConventions.GenAIAgentId]: agentId,
        [ElasticGenAIAttributes.AgentConfig]: safeJsonStringify(configuration),
      },
    },
    (span) => {
      if (!span) {
        return cb();
      }

      const res = cb(span);
      return res.then((agentReturn) => {
        span.setAttribute('output.value', safeJsonStringify(agentReturn) ?? 'unknown');
        return agentReturn;
      });
    }
  );
}
