/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// service for interacting with the server

import chrome from 'ui/chrome';
import { addSystemApiHeader } from 'ui/system_api';
import { i18n } from '@kbn/i18n';

const FETCH_TIMEOUT = 10000;

export async function http(options) {
  if(!(options && options.url)) {
    throw(
      i18n.translate('xpack.fileUpload.httpService.noUrl',
        { defaultMessage: 'No URL provided' })
    );
  }
  const url = options.url || '';
  const headers = addSystemApiHeader({
    'Content-Type': 'application/json',
    'kbn-version': chrome.getXsrfToken(),
    ...options.headers
  });

  const allHeaders = (options.headers === undefined) ? headers : { ...options.headers, ...headers };
  const body = (options.data === undefined) ? null : JSON.stringify(options.data);

  const payload = {
    method: (options.method || 'GET'),
    headers: allHeaders,
    credentials: 'same-origin'
  };

  if (body !== null) {
    payload.body = body;
  }
  return await fetchWithTimeout(url, payload);
}

async function fetchWithTimeout(url, payload) {
  let timedOut = false;

  return new Promise(function (resolve, reject) {
    const timeout = setTimeout(function () {
      timedOut = true;
      reject(new Error(
        i18n.translate('xpack.fileUpload.httpService.requestTimedOut',
          { defaultMessage: 'Request timed out' }))
      );
    }, FETCH_TIMEOUT);

    fetch(url, payload)
      .then(resp => {
        clearTimeout(timeout);
        if (!timedOut) {
          resolve(resp);
        }
      })
      .catch(function (err) {
        reject(err);
        if (timedOut) return;
      });
  }).then(resp => resp.json())
    .catch(function (err) {
      console.error(
        i18n.translate('xpack.fileUpload.httpService.fetchError', {
          defaultMessage: 'Error performing fetch: {error}',
          values: { error: err.message }
        }));
    });
}
