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

import { format as formatUrl } from 'url';

import { Role } from './role';
import { User } from './user';
import { FtrProviderContext } from '../../ftr_provider_context';

export async function SecurityServiceProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const kibanaServer = getService('kibanaServer');
  const url = formatUrl(config.get('servers.kibana'));

  const secService = await new (class SecurityService {
    role = new Role(url, log);
    user = new User(url, log);

    async setupConfiguredRoles() {
      for (const [name, definition] of Object.entries(config.get('security.roles'))) {
        // create the defined roles (need to map array to create roles)
        await secService.role.create(name, definition);
      }
    }
    async setupTestUser() {
      // const secService = await new SecurityService(url, log);
      try {
        // delete the test_user if present (will it error if the user doesn't exist?)
        await secService.user.delete('test_user');
      } catch (exception) {
        log.debug('no test user to delete');
      }

      // create test_user with username and pwd
      await secService.user.create('test_user', {
        password: 'changeme',
        roles: config.get('security.defaultRoles'),
        full_name: 'test user',
      });
    }
  })();

  const enabledPlugins = await kibanaServer.plugins.getEnabledIds();
  if (enabledPlugins.includes('security')) {
    await secService.setupConfiguredRoles();
    await secService.setupTestUser();
  }

  return secService;
}
