/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common';
import { installEntityStoreSuite } from '../../../common/fixtures/helpers';

globalSetupHook(
  'Install Entity Store once for CRUD and resolution API suite',
  async ({ apiClient, samlAuth, kbnClient }) => {
    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });
    await installEntityStoreSuite({ apiClient, samlAuth });
  }
);
