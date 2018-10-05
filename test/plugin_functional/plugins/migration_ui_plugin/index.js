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

import Joi from 'joi';
import { handleRequest } from '../../../../src/server/saved_objects/migrations/kibana/inject_migration_ui';

/**
 * This plugin allows us to test the main test cases for the migration progress UI.
 * It allows programatic resetting of its state, and it moves progress forward as
 * the UI polls, tossing an error in there to ensure the UI handles that case.
 */
export default function (kibana) {
  return new kibana.Plugin({
    init(server) {
      let count = 0;
      let isEnabled = false;

      const fakeServer = {
        kibanaMigrator: {
          async fetchMigrationProgress() {
            ++count;
            switch (count) {
              case 1:
                return 0.5;
              case 2:
                throw new Error('Something bad happened, mkay?!?');
              case 3:
                return 0.75;
              default:
                isEnabled = false;
                return 1;
            }
          }
        },
        config: () => server.config(),
      };

      server.ext('onRequest', (request, h) => handleRequest(isEnabled, fakeServer, request, h));

      server.route({
        path: '/api/migration_ui_plugin/reset',
        method: 'POST',
        config: {
          validate: {
            payload: Joi.object({
              count: Joi.number().required(),
              isEnabled: Joi.boolean().required(),
            }),
          },
        },
        async handler(request, reply) {
          count = request.payload.count;
          isEnabled = request.payload.isEnabled;
          return reply({ count, isEnabled });
        },
      });
    }
  });
}
