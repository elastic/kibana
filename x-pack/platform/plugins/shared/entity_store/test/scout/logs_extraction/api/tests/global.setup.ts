/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../../common';
import { installEntityStoreSuiteWithKbnClient } from '../../../common/fixtures/helpers';

globalSetupHook(
  'Install Entity Store once for logs extraction API suite',
  async ({ kbnClient }) => {
    await installEntityStoreSuiteWithKbnClient({
      kbnClient,
      suiteId: 'logs_extraction',
    });

    const startResponse = await kbnClient.request({
      method: 'PUT',
      path: ENTITY_STORE_ROUTES.public.START,
      headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
      body: {},
    });
    if (startResponse.status !== 200) {
      throw new Error(`Failed to start entity types for logs suite: ${startResponse.status}`);
    }
  }
);
