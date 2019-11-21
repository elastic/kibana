/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// service for interacting with the server

import chrome from 'ui/chrome';

// @ts-ignore
import { addSystemApiHeader } from 'ui/system_api';

import { Dictionary } from '../../../common/types/common';

export function http(options: Dictionary<any>) {
  return new Promise((resolve, reject) => {
    if (options && options.url) {
      let url = '';
      url = url + (options.url || '');
      const headers = addSystemApiHeader({
        'Content-Type': 'application/json',
        'kbn-version': chrome.getXsrfToken(),
        ...options.headers,
      });

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

      fetch(url, payload)
        .then(resp => {
          resp.json().then(resp.ok === true ? resolve : reject);
        })
        .catch(resp => {
          reject(resp);
        });
    } else {
      reject();
    }
  });
}
