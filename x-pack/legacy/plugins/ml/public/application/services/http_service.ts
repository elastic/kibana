/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { HttpFetchOptionsWithPath } from 'kibana/public';
import { getHttp } from '../util/dependency_cache';

function getResultHeaders(headers: HeadersInit): HeadersInit {
  return {
    asSystemRequest: true,
    'Content-Type': 'application/json',
    ...headers,
  } as HeadersInit;
}

// interface HttpOptions {
//   url: string;
//   method: string;
//   headers?: any;
//   data?: any;
// }

/**
 * Function for making HTTP requests to Kibana's backend.
 * Wrapper for Kibana's HttpHandler.
 */
export async function http(options: HttpFetchOptionsWithPath) {
  if (!options?.path) {
    throw new Error('URL path is missing');
  }

  try {
    let path = '';
    path = path + (options.path || '');
    const headers = getResultHeaders(options.headers ?? {});

    const allHeaders = options.headers === undefined ? headers : { ...options.headers, ...headers };
    const body = options.body === undefined ? null : JSON.stringify(options.body);

    const payload: RequestInit = {
      method: options.method || 'GET',
      headers: allHeaders,
      credentials: 'same-origin',
    };

    if (body !== null) {
      payload.body = body;
    }

    return await getHttp().fetch(path, payload);
  } catch (e) {
    throw new Error(e);
  }
}

interface RequestOptions extends RequestInit {
  body: BodyInit | any;
}

/**
 * Function for making HTTP requests to Kibana's backend which returns an Observable
 * with request cancellation support.
 */
export function http$<T>(path: string, options: RequestOptions): Observable<T> {
  const requestInit: RequestInit = {
    ...options,
    credentials: 'same-origin',
    method: options.method || 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) as string } : {}),
    headers: getResultHeaders(options.headers ?? {}),
  };

  return fromHttpHandler<T>(path, requestInit);
}

/**
 * Creates an Observable from Kibana's HttpHandler.
 */
export function fromHttpHandler<T>(input: string, init?: RequestInit): Observable<T> {
  return new Observable<T>(subscriber => {
    const controller = new AbortController();
    const signal = controller.signal;

    let abortable = true;
    let unsubscribed = false;

    if (init?.signal) {
      if (init.signal.aborted) {
        controller.abort();
      } else {
        init.signal.addEventListener('abort', () => {
          if (!signal.aborted) {
            controller.abort();
          }
        });
      }
    }

    const perSubscriberInit: RequestInit = {
      ...(init ? init : {}),
      signal,
    };

    getHttp()
      .fetch<T>(input, perSubscriberInit)
      .then(response => {
        abortable = false;
        subscriber.next(response);
        subscriber.complete();
      })
      .catch(err => {
        abortable = false;
        if (!unsubscribed) {
          subscriber.error(err);
        }
      });

    return () => {
      unsubscribed = true;
      if (abortable) {
        controller.abort();
      }
    };
  });
}
