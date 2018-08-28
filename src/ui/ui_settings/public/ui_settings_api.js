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

import { sendRequest } from './send_request';

const NOOP_CHANGES = {
  values: {},
  callback: () => {},
};

export function createUiSettingsApi() {
  let pendingChanges = null;
  let sendInProgress = false;

  async function flushPendingChanges() {
    if (!pendingChanges) {
      return;
    }

    if (sendInProgress) {
      return;
    }

    const changes = pendingChanges;
    pendingChanges = null;

    try {
      sendInProgress = true;
      changes.callback(null, await sendRequest({
        method: 'POST',
        path: '/api/kibana/settings',
        body: {
          changes: changes.values
        },
      }));
    } catch (error) {
      changes.callback(error);
    } finally {
      sendInProgress = false;
      flushPendingChanges();
    }
  }

  return new class Api {
    batchSet(key, value) {
      return new Promise((resolve, reject) => {
        const prev = pendingChanges || NOOP_CHANGES;

        pendingChanges = {
          values: {
            ...prev.values,
            [key]: value,
          },

          callback(error, resp) {
            prev.callback(error, resp);

            if (error) {
              reject(error);
            } else {
              resolve(resp);
            }
          },
        };

        flushPendingChanges();
      });
    }
  };
}
