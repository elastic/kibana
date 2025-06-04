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
} from '@kbn/onechat-server';

/**
 * Creates a run event emitter sending events to the provided event handler.
 */
export const createEventEmitter = ({
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
export const createNoopEventEmitter = (): RunEventEmitter => {
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
