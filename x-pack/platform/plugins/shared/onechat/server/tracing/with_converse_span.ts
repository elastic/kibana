/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from '@opentelemetry/api';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
import { safeJsonStringify } from '@kbn/std';
import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { ChatEvent } from '@kbn/onechat-common';
import { isRoundCompleteEvent } from '@kbn/onechat-common';

interface WithConverseSpanOptions {
  agentId: string;
  conversationId: string | undefined;
}

export function withConverseSpan(
  { agentId, conversationId }: WithConverseSpanOptions,
  cb: (span?: Span) => Observable<ChatEvent>
): Observable<ChatEvent> {
  return withActiveInferenceSpan(
    'Converse',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
        [ElasticGenAIAttributes.AgentId]: agentId,
        [ElasticGenAIAttributes.AgentConversationId]: conversationId,
      },
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
