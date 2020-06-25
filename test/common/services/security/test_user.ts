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
import { Role } from './role';
import { User } from './user';
import { FtrProviderContext } from '../../ftr_provider_context';
import { Browser } from '../../../functional/services/common';
import { TestSubjects } from '../../../functional/services/common';

export async function createTestUserService(
  role: Role,
  user: User,
  { getService, hasService }: FtrProviderContext
) {
  const log = getService('log');
  const config = getService('config');
  // @ts-ignore browser service is not normally available in common.
  const browser: Browser | void = hasService('browser') && getService('browser');
  const testSubjects: TestSubjects | undefined =
    // testSubject service is not normally available in common.
    hasService('testSubjects') ? (getService('testSubjects' as any) as TestSubjects) : undefined;
  const kibanaServer = getService('kibanaServer');

  const enabledPlugins = config.get('security.disableTestUser')
    ? []
    : await kibanaServer.plugins.getEnabledIds();
  const isEnabled = () => {
    return enabledPlugins.includes('security') && !config.get('security.disableTestUser');
  };
  if (isEnabled()) {
    log.debug('===============creating roles and users===============');
    for (const [name, definition] of Object.entries(config.get('security.roles'))) {
      // create the defined roles (need to map array to create roles)
      await role.create(name, definition);
    }
    try {
      // delete the test_user if present (will it error if the user doesn't exist?)
      await user.delete('test_user');
    } catch (exception) {
      log.debug('no test user to delete');
    }

    // create test_user with username and pwd
    log.debug(`default roles = ${config.get('security.defaultRoles')}`);
    await user.create('test_user', {
      password: 'changeme',
      roles: config.get('security.defaultRoles'),
      full_name: 'test user',
    });
  }

  return new (class TestUser {
    async restoreDefaults() {
      if (isEnabled()) {
        await this.setRoles(config.get('security.defaultRoles'));
      }
    }

    async setRoles(roles: string[], shouldRefreshBrowser: boolean = true) {
      if (isEnabled()) {
        log.debug(`set roles = ${roles}`);
        await user.create('test_user', {
          password: 'changeme',
          roles,
          full_name: 'test user',
        });

        if (browser && testSubjects && shouldRefreshBrowser) {
          if (await testSubjects.exists('kibanaChrome', { allowHidden: true })) {
            await browser.refresh();
            await testSubjects.find('kibanaChrome', config.get('timeouts.find') * 10);
          }
        }
      }
    }
  })();
}
