/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  ACCESS_CONTROL_TYPE,
  cleanupAccessControlObjects,
  CREATE_PATH,
  loginAsKibanaAdmin,
  setupAccessControlUsers,
  withXsrf,
} from '../common/access_control';

apiTest.describe(
  'spaces access control - default state of access control objects',
  { tag: tags.stateful.classic },
  () => {
    apiTest.beforeAll(async ({ esClient, kbnClient }) => {
      await setupAccessControlUsers({ esClient, kbnClient });
    });

    apiTest.afterAll(async ({ kbnClient, log }) => {
      await cleanupAccessControlObjects(kbnClient, log);
    });

    apiTest(
      'types supporting access control are created with default access mode when not specified',
      async ({ apiClient, config }) => {
        const { cookieHeader, profileUid } = await loginAsKibanaAdmin(apiClient, config);

        const response = await apiClient.post(CREATE_PATH, {
          headers: withXsrf(cookieHeader),
          body: { type: ACCESS_CONTROL_TYPE },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.accessControl).toBeDefined();
        expect(response.body.accessControl.accessMode).toBe('default');
        expect(response.body.accessControl.owner).toBe(profileUid);
      }
    );
  }
);
