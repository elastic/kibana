/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonoTypeOperatorFunction, catchError, throwError } from 'rxjs';
import { isSSEError } from '@kbn/sse-utils';
import { createOnechatError, OnechatErrorCode } from '@kbn/onechat-common';

/**
 * Convert SSE errors to Onechat errors and rethrow them.
 */
export function unwrapOnechatErrors<T>(): MonoTypeOperatorFunction<T> {
  return catchError((err) => {
    if (isSSEError(err)) {
      return throwError(() =>
        createOnechatError(err.code as OnechatErrorCode, err.message, err.meta)
      );
    }
    return throwError(() => err);
  });
}
