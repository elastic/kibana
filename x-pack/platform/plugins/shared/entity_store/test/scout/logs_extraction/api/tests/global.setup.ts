/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common';
import { PUBLIC_HEADERS } from '../../../common/fixtures/constants';
import { installEntityStoreSuite, startAllEntityTypes } from '../../../common/fixtures/helpers';

globalSetupHook(
  'Install Entity Store once for logs extraction API suite',
  async ({ apiClient, samlAuth, kbnClient }) => {
    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });
    await installEntityStoreSuite({ apiClient, samlAuth });

    const credentials = await samlAuth.asInteractiveUser('admin');
    const defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    const startResponse = await startAllEntityTypes(apiClient, defaultHeaders);
    if (startResponse.statusCode !== 200) {
      throw new Error(`Failed to start entity types for logs suite: ${startResponse.statusCode}`);
    }
  }
);
