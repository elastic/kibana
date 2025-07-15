/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Span } from '@opentelemetry/api';
import { safeJsonStringify } from '@kbn/std';
import { withInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { AgentDefinition } from '@kbn/onechat-common';
import type { AgentHandlerReturn } from '@kbn/onechat-server';

interface WithConverseSpanOptions {
  agent: AgentDefinition;
}

export function withConverseSpan(
  { agent }: WithConverseSpanOptions,
  cb: (span?: Span) => Promise<AgentHandlerReturn>
): Promise<AgentHandlerReturn> {
  const { id: agentId, configuration } = agent;
  return withInferenceSpan(
    {
      name: 'converse',
      [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      [ElasticGenAIAttributes.AgentId]: agentId,
      [ElasticGenAIAttributes.AgentConfig]: safeJsonStringify(configuration),
    },
    (span) => {
      if (!span) {
        return cb();
      }

      const res = cb(span);
      res.then((agentReturn) => {
        span.setAttribute('output.value', safeJsonStringify(agentReturn) ?? 'unknown');
      });
      return res;
    }
  );
}
