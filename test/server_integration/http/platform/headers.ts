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
import Http from 'http';
import Url from 'url';
import { FtrProviderContext } from '../../services/types';

// @ts-ignore
import getUrl from '../../../../src/test_utils/get_url';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const oneSec = 1_000;

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');

  describe('headers timeout ', () => {
    it('handles correctly. See issue #73849', async () => {
      const agent = new Http.Agent({
        keepAlive: true,
      });
      const { protocol, hostname, port } = Url.parse(getUrl.baseUrl(config.get('servers.kibana')));

      function performRequest() {
        return new Promise((resolve, reject) => {
          const req = Http.request(
            {
              protocol,
              hostname,
              port,
              path: '/',
              method: 'GET',
              agent,
            },
            function (res) {
              let data = '';
              res.on('data', (chunk) => {
                data += chunk;
              });
              res.on('end', () => resolve(data));
            }
          );

          req.on('socket', (socket) => {
            socket.write('GET / HTTP/1.1\r\n');
            setTimeout(() => {
              socket.write('Host: localhost\r\n');
            }, oneSec);
            setTimeout(() => {
              // headersTimeout doesn't seem to fire if request headers are sent in one packet.
              socket.write('\r\n');
              req.end();
            }, 2 * oneSec);
          });

          req.on('error', reject);
        });
      }

      await performRequest();
      const defaultHeadersTimeout = 60 * oneSec;
      await delay(defaultHeadersTimeout + oneSec);
      await performRequest();
    });
  });
}
