/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Span } from '@opentelemetry/api';
import { Observable, tap } from 'rxjs';
import { safeJsonStringify } from '@kbn/std';
import { withInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import { AgentMode, ChatEvent, isRoundCompleteEvent } from '@kbn/onechat-common';

interface WithConverseSpanOptions {
  agentId: string;
  mode: AgentMode;
  conversationId: string | undefined;
}

export function withConverseSpan(
  { agentId, conversationId, mode }: WithConverseSpanOptions,
  cb: (span?: Span) => Observable<ChatEvent>
): Observable<ChatEvent> {
  return withInferenceSpan(
    {
      name: 'converse',
      [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      [ElasticGenAIAttributes.AgentId]: agentId,
      [ElasticGenAIAttributes.AgentConversationId]: conversationId,
      [ElasticGenAIAttributes.AgentMode]: mode,
    },
    (span) => {
      if (!span) {
        return cb();
      }

      return cb(span).pipe(
        tap({
          next: (event) => {
            if (isRoundCompleteEvent(event)) {
              span.setAttribute('output.value', safeJsonStringify(event.data) ?? 'unknown');
            }
          },
        })
      );
    }
  );
}
