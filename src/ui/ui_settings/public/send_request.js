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

import chrome from 'ui/chrome';
import { metadata } from 'ui/metadata';

export async function sendRequest({ method, path, body }) {
  chrome.loadingCount.increment();
  try {
    const response = await fetch(chrome.addBasePath(path), {
      method,
      body: JSON.stringify(body),
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'kbn-version': metadata.version,
      },
      credentials: 'same-origin'
    });

    if (response.status >= 300) {
      throw new Error(`Request failed with status code: ${response.status}`);
    }

    return await response.json();
  } finally {
    chrome.loadingCount.decrement();
  }
}
