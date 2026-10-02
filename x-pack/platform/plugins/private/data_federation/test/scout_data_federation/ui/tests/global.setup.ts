/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout';
import { enableDataFederationSetting } from '../fixtures/data_federation_setting';

globalSetupHook(
  'Enable dataFederation:enabled',
  { tag: tags.stateful.classic },
  async ({ kbnClient, log }) => {
    log.debug('[setup] enabling dataFederation:enabled');
    await enableDataFederationSetting(kbnClient);
  }
);
