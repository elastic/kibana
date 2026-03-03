/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction, Observable } from 'rxjs';
import { switchMap, throwError, of } from 'rxjs';
import type { Readable } from 'stream';
import { isReadable } from 'stream';
import { createInferenceInternalError } from '@kbn/inference-common';
import type { InferenceInvokeResult } from './inference_executor';
import { convertUpstreamError } from './convert_upstream_error';

export function handleConnectorStreamResponse<T>({
  processStream,
}: {
  processStream: (stream: Readable) => Observable<T>;
}): OperatorFunction<InferenceInvokeResult, T> {
  return (source$) => {
    return source$.pipe(
      switchMap((response) => {
        if (response.status === 'error') {
          return throwError(() =>
            convertUpstreamError(response.serviceMessage!, {
              messagePrefix: 'Error calling connector:',
            })
          );
        }

        if (isReadable(response.data as any)) {
          return processStream(response.data as Readable);
        }
        return throwError(() =>
          createInferenceInternalError('Unexpected error', response.data as Record<string, any>)
        );
      })
    );
  };
}

export function handleConnectorDataResponse<T>({
  parseData,
}: {
  parseData: (data: unknown) => T;
}): OperatorFunction<InferenceInvokeResult, T> {
  return (source$) => {
    return source$.pipe(
      switchMap((response) => {
        if (response.status === 'error') {
          return throwError(() =>
            convertUpstreamError(response.serviceMessage!, {
              messagePrefix: 'Error calling connector:',
            })
          );
        }

        return of(parseData(response.data));
      })
    );
  };
}
