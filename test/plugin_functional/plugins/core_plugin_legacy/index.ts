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

import KbnServer from 'src/legacy/server/kbn_server';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    id: 'core_plugin_legacy',
    require: ['kibana'],
    uiExports: {
      app: {
        title: 'Core Legacy Compat',
        description: 'This is a sample plugin to test core to legacy compatibility',
        main: 'plugins/core_plugin_legacy/index',
      },
    },
    init(server: KbnServer) {
      const { http } = server.newPlatform.setup.core;
      const router = http.createRouter();

      router.get({ path: '/api/np-http-in-legacy', validate: false }, async (context, req, res) => {
        const response = await context.core.elasticsearch.adminClient.callAsInternalUser('ping');
        return res.ok({ body: `Pong in legacy via new platform: ${response}` });
      });

      router.get({ path: '/api/np-context-in-legacy', validate: false }, (context, req, res) => {
        const contexts = Object.keys(context);
        return res.ok({ body: { contexts } });
      });
    },
  });
}
