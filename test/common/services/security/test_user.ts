/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { format as formatUrl } from 'url';
import supertestAsPromised from 'supertest-as-promised';

import { Role } from './role';
import { User } from './user';
import { FtrProviderContext } from '../../ftr_provider_context';
import { Browser } from '../../../functional/services/common';
import { TestSubjects } from '../../../functional/services/common';

const TEST_USER_NAME = 'test_user';
const TEST_USER_PASSWORD = 'changeme';

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
      await user.delete(TEST_USER_NAME);
    } catch (exception) {
      log.debug('no test user to delete');
    }

    // create test_user with username and pwd
    log.debug(`default roles = ${config.get('security.defaultRoles')}`);
    await user.create(TEST_USER_NAME, {
      password: TEST_USER_PASSWORD,
      roles: config.get('security.defaultRoles'),
      full_name: 'test user',
    });
  }

  return new (class TestUser {
    async restoreDefaults(shouldRefreshBrowser: boolean = true) {
      if (isEnabled()) {
        await this.setRoles(config.get('security.defaultRoles'), shouldRefreshBrowser);
      }
    }

    async setRoles(roles: string[], shouldRefreshBrowser: boolean = true) {
      if (isEnabled()) {
        log.debug(`set roles = ${roles}`);
        await user.create(TEST_USER_NAME, {
          password: TEST_USER_PASSWORD,
          roles,
          full_name: 'test user',
        });

        if (browser && testSubjects && shouldRefreshBrowser) {
          if (await testSubjects.exists('kibanaChrome', { allowHidden: true })) {
            await browser.refresh();
            // accept alert if it pops up
            const alert = await browser.getAlert();
            await alert?.accept();
            await testSubjects.find('kibanaChrome', config.get('timeouts.find') * 10);
          }
        }
      }
    }
  })();
}

export function TestUserSupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');

  return supertestAsPromised(
    formatUrl({
      ...kibanaServerConfig,
      auth: `${TEST_USER_NAME}:${TEST_USER_PASSWORD}`,
    })
  );
}
