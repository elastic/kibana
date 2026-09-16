/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const handlersByEvent = new Map();

export const eventBus = {
  on(event, handler) {
    const handlers = handlersByEvent.get(event) ?? new Set();
    handlers.add(handler);
    handlersByEvent.set(event, handlers);
  },

  off(event, handler) {
    const handlers = handlersByEvent.get(event);
    if (!handlers) {
      return;
    }

    if (handler) {
      handlers.delete(handler);
      return;
    }

    handlers.clear();
  },

  trigger(event, extraArgs = []) {
    const handlers = handlersByEvent.get(event);
    if (!handlers) {
      return;
    }

    const syntheticEvent = { type: event };
    for (const handler of handlers) {
      handler(syntheticEvent, ...extraArgs);
    }
  },
};
