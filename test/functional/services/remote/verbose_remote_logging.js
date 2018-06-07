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

import { green, magentaBright } from 'chalk';

export function initVerboseRemoteLogging(log, server) {
  const wrap = (original, httpMethod) => (path, requestData, pathParts) => {
    const url = '/' + path.split('/').slice(2).join('/').replace(/\$(\d)/, function (_, index) {
      return encodeURIComponent(pathParts[index]);
    });

    if (requestData == null) {
      log.verbose('[remote] >  %s %s', httpMethod, url);
    } else {
      log.verbose('[remote] >  %s %s %j', httpMethod, url, requestData);
    }

    return original.call(server, path, requestData, pathParts)
      .then(result => {
        log.verbose(`[remote]  < %s %s ${green('OK')}`, httpMethod, url);
        return result;
      })
      .catch(error => {
        let message;
        try {
          message = JSON.parse(error.response.data).value.message;
        } catch (err) {
          message = err.message;
        }

        log.verbose(`[remote]  < %s %s ${magentaBright('ERR')} %j`, httpMethod, url, message.split(/\r?\n/)[0]);
        throw error;
      });
  };

  server._get = wrap(server._get, 'GET');
  server._post = wrap(server._post, 'POST');
  server._delete = wrap(server._delete, 'DELETE');
  return server;
}
