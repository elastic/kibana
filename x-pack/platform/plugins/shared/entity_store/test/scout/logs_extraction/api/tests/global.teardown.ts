/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout';
import { uninstallEntityStoreSuite } from '../../../common/fixtures/helpers';

globalTeardownHook(
  'Uninstall Entity Store for logs extraction API suite',
  async ({ apiClient, esClient, kbnClient, samlAuth }) => {
    await uninstallEntityStoreSuite({ apiClient, esClient, kbnClient, samlAuth });
  }
);
