/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentEventEmitter,
  RunAgentOnEventFn,
  RunContext,
  ToolEventEmitter,
  ToolEventHandlerFn,
} from '@kbn/onechat-server';
import type { InternalToolProgressEvent } from '@kbn/onechat-server/runner';
import { ChatEventType } from '@kbn/onechat-common';

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
    return createNoopToolEventEmitter();
  }

  return {
    reportProgress: (progressMessage) => {
      const event: InternalToolProgressEvent = {
        type: ChatEventType.toolProgress,
        data: {
          message: progressMessage,
        },
      };
      eventHandler(event);
    },
  };
};

const createNoopToolEventEmitter = () => {
  return {
    reportProgress: () => {},
  };
};

const createNoopEventEmitter = () => {
  return {
    emit: () => {},
  };
};
