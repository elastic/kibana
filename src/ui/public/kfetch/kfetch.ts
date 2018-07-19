/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import 'isomorphic-fetch';
import { merge } from 'lodash';
import url from 'url';
import chrome from '../chrome';

// @ts-ignore not really worth typing
import { metadata } from '../metadata';

class FetchError extends Error {
  constructor(public readonly res: Response, public readonly body?: any) {
    super(res.statusText);
    Error.captureStackTrace(this, FetchError);
  }
}

export interface KFetchOptions extends RequestInit {
  pathname?: string;
  query?: { [key: string]: string | number | boolean };
}

export interface KFetchKibanaOptions {
  prependBasePath?: boolean;
}

export function kfetch(fetchOptions: KFetchOptions, kibanaOptions?: KFetchKibanaOptions) {
  // fetch specific options with defaults
  const { pathname, query, ...combinedFetchOptions } = merge(
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'kbn-version': metadata.version,
      },
    },
    fetchOptions
  );

  // kibana specific options with defaults
  const combinedKibanaOptions = {
    prependBasePath: true,
    ...kibanaOptions,
  };

  const fullUrl = url.format({
    pathname: combinedKibanaOptions.prependBasePath ? chrome.addBasePath(pathname) : pathname,
    query,
  });

  const fetching = new Promise<any>(async (resolve, reject) => {
    const res = await fetch(fullUrl, combinedFetchOptions);

    if (res.ok) {
      return resolve(await res.json());
    }

    try {
      // attempt to read the body of the response
      return reject(new FetchError(res, await res.json()));
    } catch (_) {
      // send FetchError without the body if we are not be able to read the body for some reason
      return reject(new FetchError(res));
    }
  });

  return fetching;
}
