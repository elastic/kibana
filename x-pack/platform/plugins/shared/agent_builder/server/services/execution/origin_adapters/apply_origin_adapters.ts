/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, type OperatorFunction } from 'rxjs';
import { SpanKind } from '@opentelemetry/api';
import type { Logger } from '@kbn/logging';
import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import {
  isMessageChunkEvent,
  type ChatEvent,
  type ConversationSource,
  type ConversationSourceType,
} from '@kbn/agent-builder-common';
import { getOriginAdapter } from './registry';
import type { OriginAdapter } from './types';

/**
 * Wraps an origin adapter run in a tracing span.
 */
const withOriginAdapterSpan = <T>(type: ConversationSourceType, cb: () => T): T => {
  return withActiveInferenceSpan(
    `origin_adapter ${type}`,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
        'agent_builder.origin.type': type,
      },
    },
    () => cb()
  );
};

/**
 * Message chunks are too frequent to trace one by one, so the adapter runs on them without a span.
 */
const project = (adapter: OriginAdapter, event: ChatEvent) =>
  isMessageChunkEvent(event)
    ? adapter.project(event)
    : withOriginAdapterSpan(adapter.type, () => adapter.project(event));

/**
 * Runs the adapter of the conversation's origin on every event, and adds its output to a copy of
 * the event under `projection`. Events pass through unchanged when the conversation has no origin,
 * or when the adapter has no output or throws, so a failing adapter never breaks the stream.
 */
export const applyOriginAdapters = ({
  source,
  logger,
}: {
  source: ConversationSource | undefined;
  logger: Logger;
}): OperatorFunction<ChatEvent, ChatEvent> => {
  const adapter = source ? getOriginAdapter(source.type) : undefined;

  return map((event) => {
    if (!adapter) {
      return event;
    }

    let output: ReturnType<OriginAdapter['project']>;
    try {
      output = project(adapter, event);
    } catch (error) {
      logger.warn(`Origin adapter "${adapter.type}" failed on "${event.type}" event: ${error}`);
      return event;
    }

    if (!output) {
      return event;
    }

    return { ...event, projection: { ...event.projection, [adapter.type]: output } };
  });
};
