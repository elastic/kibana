/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { ServerSentEventError } from '@kbn/sse-utils';
import type { CustomContentTokenEvent } from '../../common/types';
import { CUSTOM_CONTENT_GENERATE_ROUTE } from '../../common/constants';

interface GenerateParams {
  prompt?: string;
  colorMode: 'LIGHT' | 'DARK';
  esqlQuery?: string;
  timeRange?: TimeRange;
}

export function streamGenerate(
  http: HttpStart,
  params: GenerateParams,
  onToken: (token: string) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    defer(() =>
      http.post(CUSTOM_CONTENT_GENERATE_ROUTE, {
        body: JSON.stringify(params),
        asResponse: true,
        rawResponse: true,
        signal,
      })
    )
      .pipe(httpResponseIntoObservable<CustomContentTokenEvent>())
      .subscribe({
        next: (event) => {
          if (event.type === 'token' && event.token) {
            onToken(event.token);
          }
        },
        error: (err) => {
          if (err instanceof ServerSentEventError) {
            const sseErr = new Error(err.message) as Error & { code?: string };
            sseErr.code = err.code;
            reject(sseErr);
          } else {
            reject(err);
          }
        },
        complete: () => resolve(),
      });
  });
}
