/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OnechatRunEvent,
  InternalRunEvent,
  RunContext,
  OnechatRunEventMeta,
  RunEventHandlerFn,
  RunEventEmitter,
  AgentEventEmitter,
  RunAgentOnEventFn,
} from '@kbn/onechat-server';

/**
 * Creates a run event emitter sending events to the provided event handler.
 */
export const createAgentEventEmitter = ({
  eventHandler,
  context,
}: {
  eventHandler: RunAgentOnEventFn | undefined;
  context: RunContext;
}): AgentEventEmitter => {
  if (eventHandler === undefined) {
    return createNoopEventEmitter();
  }

  return {
    emit: (internalEvent) => {
      eventHandler(internalEvent);
    },
  };
};

/**
 * Creates a run event emitter sending events to the provided event handler.
 */
export const createToolEventEmitter = ({
  eventHandler,
  context,
}: {
  eventHandler: RunEventHandlerFn;
  context: RunContext;
}): RunEventEmitter => {
  return {
    emit: (internalEvent) => {
      const event = convertInternalEvent({ event: internalEvent, context });
      eventHandler(event);
    },
  };
};

/**
 * Creates a run event emitter sending events to the provided event handler.
 */
export const createNoopEventEmitter = () => {
  return {
    emit: () => {},
  };
};

/**
 * Convert an internal onechat run event to its public-facing format.
 */
export const convertInternalEvent = <
  TEventType extends string = string,
  TData extends Record<string, any> = Record<string, any>,
  TMeta extends Record<string, any> = Record<string, any>
>({
  event: { type, data, meta },
  context,
}: {
  event: InternalRunEvent<TEventType, TData, TMeta>;
  context: RunContext;
}): OnechatRunEvent<TEventType, TData, TMeta & OnechatRunEventMeta> => {
  // TODO use OnechatEvent?
  return {
    type,
    data,
    meta: {
      ...((meta ?? {}) as TMeta),
      runId: context.runId,
      stack: context.stack,
    },
  };
};
