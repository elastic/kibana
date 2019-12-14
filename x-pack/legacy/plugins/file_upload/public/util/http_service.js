/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// service for interacting with the server

import chrome from 'ui/chrome';
import { addSystemApiHeader } from 'ui/system_api';
import { i18n } from '@kbn/i18n';

export async function http(options) {
  if (!(options && options.url)) {
    throw i18n.translate('xpack.fileUpload.httpService.noUrl', {
      defaultMessage: 'No URL provided',
    });
  }
  const url = options.url || '';
  const headers = addSystemApiHeader({
    'Content-Type': 'application/json',
    'kbn-version': chrome.getXsrfToken(),
    ...options.headers,
  });

  const allHeaders = options.headers === undefined ? headers : { ...options.headers, ...headers };
  const body = options.data === undefined ? null : JSON.stringify(options.data);

  const payload = {
    method: options.method || 'GET',
    headers: allHeaders,
    credentials: 'same-origin',
  };

  if (body !== null) {
    payload.body = body;
  }
  return await doFetch(url, payload);
}

async function doFetch(url, payload) {
  try {
    const resp = await fetch(url, payload);
    return resp.json();
  } catch (err) {
    return {
      failures: [
        i18n.translate('xpack.fileUpload.httpService.fetchError', {
          defaultMessage: 'Error performing fetch: {error}',
          values: { error: err.message },
        }),
      ],
    };
  }
}
