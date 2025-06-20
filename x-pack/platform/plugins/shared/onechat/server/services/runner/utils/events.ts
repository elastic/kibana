/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RunContext,
  ToolEventHandlerFn,
  ToolEventEmitter,
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
  eventHandler: ToolEventHandlerFn | undefined;
  context: RunContext;
}): ToolEventEmitter => {
  if (eventHandler === undefined) {
    return createNoopEventEmitter();
  }

  return {
    emit: (event) => {
      eventHandler(event);
    },
  };
};

const createNoopEventEmitter = () => {
  return {
    emit: () => {},
  };
};
