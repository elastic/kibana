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
import url from 'url';
import chrome from '../chrome';
import { metadata } from '../metadata';
import { merge } from 'lodash';

class FetchError extends Error {
  constructor(res) {
    super(res.statusText);
    this.res = res;
    Error.captureStackTrace(this, FetchError);
  }
}

export async function kfetch(fetchOptions, kibanaOptions) {
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

  const res = await fetch(fullUrl, combinedFetchOptions);

  if (!res.ok) {
    throw new FetchError(res);
  }

  return res.json();
}
