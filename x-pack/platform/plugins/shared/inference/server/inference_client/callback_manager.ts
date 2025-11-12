/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import type {
  InferenceCompleteCallbackHandler,
  InferenceErrorCallbackHandler,
  InferenceCallbacks,
} from '@kbn/inference-common/src/chat_complete';
import type { InferenceEventEmitter } from '@kbn/inference-common';

export interface InferenceCallbackManager {
  onComplete: InferenceCompleteCallbackHandler;
  onError: InferenceErrorCallbackHandler;
}

export interface InternalCallbackManager extends InferenceCallbackManager {
  // TODO
  asEventEmitter: () => InferenceEventEmitter;
}

interface InternalCallbacks {
  complete: InferenceCompleteCallbackHandler[];
  error: InferenceErrorCallbackHandler[];
}

export const createCallbackManager = (cbs?: InferenceCallbacks): InternalCallbackManager => {
  const callbacks: InternalCallbacks = {
    complete: [],
    error: [],
  };
  if (cbs?.complete) {
    callbacks.complete.push(...(isArray(cbs.complete) ? cbs.complete : [cbs.complete]));
  }
  if (cbs?.error) {
    callbacks.error.push(...(isArray(cbs.error) ? cbs.error : [cbs.error]));
  }

  const asEventEmitter = (): InferenceEventEmitter => {
    return {
      on(type, handler) {
        if (type === 'complete') {
          callbacks.complete.push(handler as InferenceCompleteCallbackHandler);
        }
        if (type === 'error') {
          callbacks.error.push(handler as InferenceErrorCallbackHandler);
        }
      },
    };
  };

  return {
    onComplete: (event) => {
      callbacks.complete.forEach((cb) => {
        cb(event);
      });
    },
    onError: (event) => {
      callbacks.error.forEach((cb) => {
        cb(event);
      });
    },
    asEventEmitter,
  };
};
