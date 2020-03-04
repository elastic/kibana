/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';

import { getHttp } from '../util/dependency_cache';

function getResultHeaders(headers: HeadersInit): HeadersInit {
  return {
    asSystemRequest: false,
    'Content-Type': 'application/json',
    ...headers,
  } as HeadersInit;
}

interface HttpOptions {
  url: string;
  method: string;
  headers?: any;
  data?: any;
}

/**
 * Function for making HTTP requests to Kibana's backend.
 * Wrapper for Kibana's HttpHandler.
 */
export async function http(options: HttpOptions) {
  if (!options?.url) {
    throw new Error('URL is missing');
  }

  try {
    let url = '';
    url = url + (options.url || '');
    const headers = getResultHeaders(options.headers ?? {});

    const allHeaders = options.headers === undefined ? headers : { ...options.headers, ...headers };
    const body = options.data === undefined ? null : JSON.stringify(options.data);

    const payload: RequestInit = {
      method: options.method || 'GET',
      headers: allHeaders,
      credentials: 'same-origin',
    };

    if (body !== null) {
      payload.body = body;
    }

    return await getHttp().fetch(url, payload);
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
export function http$<T>(url: string, options: RequestOptions): Observable<T> {
  const requestInit: RequestInit = {
    ...options,
    credentials: 'same-origin',
    method: options.method || 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) as string } : {}),
    headers: getResultHeaders(options.headers ?? {}),
  };

  return kibanaFromFetch<T>(url, requestInit);
}

/**
 * Adjusted rxjs fromFetch to use Kibana's HttpHandler.
 */
export function kibanaFromFetch<T>(input: string, init?: RequestInit): Observable<T> {
  return new Observable<T>(subscriber => {
    const controller = new AbortController();
    const signal = controller.signal;
    let outerSignalHandler: () => void;
    let abortable = true;
    let unsubscribed = false;

    let perSubscriberInit: RequestInit;
    if (init) {
      // If a signal is provided, just have it teardown. It's a cancellation token, basically.
      if (init.signal) {
        if (init.signal.aborted) {
          controller.abort();
        } else {
          outerSignalHandler = () => {
            if (!signal.aborted) {
              controller.abort();
            }
          };
          init.signal.addEventListener('abort', outerSignalHandler);
        }
      }
      // init cannot be mutated or reassigned as it's closed over by the
      // subscriber callback and is shared between subscribers.
      perSubscriberInit = { ...init, signal };
    } else {
      perSubscriberInit = { signal };
    }

    getHttp()
      .fetch(input, perSubscriberInit)
      .then(response => {
        abortable = false;
        subscriber.next(response);
        subscriber.complete();
      })
      .catch(err => {
        abortable = false;
        if (!unsubscribed) {
          // Only forward the error if it wasn't an abort.
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
