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

const ES_ARCHIVER_LOAD_METHODS = ['load', 'loadIfNeeded', 'unload'];
const KIBANA_INDEX = '.kibana';

export function extendEsArchiver({ esArchiver, kibanaServer, retry, defaults }) {
  // only extend the esArchiver if there are default uiSettings to restore
  if (!defaults) {
    return;
  }

  ES_ARCHIVER_LOAD_METHODS.forEach((method) => {
    const originalMethod = esArchiver[method];

    esArchiver[method] = async (...args) => {
      // esArchiver methods return a stats object, with information about the indexes created
      const stats = await originalMethod.apply(esArchiver, args);

      // if the kibana index was created by the esArchiver then update the uiSettings
      // with the defaults to make sure that they are always in place initially
      if (stats[KIBANA_INDEX] && (stats[KIBANA_INDEX].created || stats[KIBANA_INDEX].deleted)) {
        await retry.try(async () => {
          await kibanaServer.uiSettings.update(defaults);
        });
      }

      return stats;
    };
  });
}
