/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
// service for interacting with the server
import { Dictionary } from '../../../common/types/common';

export type Http = (options: Dictionary<any>) => Promise<unknown>;

export function httpFactory(httpSetup: HttpSetup) {
  return function http(options: Dictionary<any>) {
    return new Promise((resolve, reject) => {
      if (options && options.url) {
        let url = '';
        url = url + (options.url || '');
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers,
        };

        const allHeaders =
          options.headers === undefined ? headers : { ...options.headers, ...headers };
        const body = options.data === undefined ? null : JSON.stringify(options.data);

        const payload: Dictionary<any> = {
          method: options.method || 'GET',
          headers: allHeaders,
          credentials: 'same-origin',
        };

        if (body !== null) {
          payload.body = body;
        }

        httpSetup
          .fetch(url, payload)
          .then(resp => {
            resolve(resp);
          })
          .catch(resp => {
            reject(resp);
          });
      } else {
        reject();
      }
    });
  };
}
