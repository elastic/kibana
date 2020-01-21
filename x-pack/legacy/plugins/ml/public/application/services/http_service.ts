/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// service for interacting with the server

import chrome from 'ui/chrome';

// @ts-ignore
import { addSystemApiHeader } from 'ui/system_api';
import { fromFetch } from 'rxjs/fetch';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface HttpOptions {
  url?: string;
}

function getResultHeaders(headers: HeadersInit): HeadersInit {
  return addSystemApiHeader({
    'Content-Type': 'application/json',
    'kbn-version': chrome.getXsrfToken(),
    ...headers,
  });
}

export function http(options: any) {
  return new Promise((resolve, reject) => {
    if (options && options.url) {
      let url = '';
      url = url + (options.url || '');
      const headers: Record<string, string> = addSystemApiHeader({
        'Content-Type': 'application/json',
        'kbn-version': chrome.getXsrfToken(),
        ...options.headers,
      });

      const allHeaders =
        options.headers === undefined ? headers : { ...options.headers, ...headers };
      const body = options.data === undefined ? null : JSON.stringify(options.data);

      const payload: RequestInit = {
        method: options.method || 'GET',
        headers: allHeaders,
        credentials: 'same-origin',
      };

      if (body !== null) {
        payload.body = body;
      }

      fetch(url, payload)
        .then(resp => {
          resp
            .json()
            .then(resp.ok === true ? resolve : reject)
            .catch(resp.ok === true ? resolve : reject);
        })
        .catch(resp => {
          reject(resp);
        });
    } else {
      reject();
    }
  });
}

interface RequestOptions extends RequestInit {
  body: BodyInit | any;
}

export function http$<T>(url: string, options: RequestOptions): Observable<T> {
  const requestInit: RequestInit = {
    ...options,
    credentials: 'same-origin',
    method: options.method || 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) as string } : {}),
    headers: getResultHeaders(options.headers ?? {}),
  };

  return fromFetch(url, requestInit).pipe(
    switchMap(response => {
      if (response.ok) {
        return from(response.json() as Promise<T>);
      } else {
        throw new Error(String(response.status));
      }
    })
  );
}
