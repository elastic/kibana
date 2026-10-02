/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook, tags } from '@kbn/scout';
import { unsetDataFederationSetting } from '../fixtures/data_federation_setting';

globalTeardownHook(
  'Reset dataFederation:enabled',
  { tag: tags.stateful.classic },
  async ({ kbnClient, log }) => {
    log.debug('[teardown] unsetting dataFederation:enabled');
    await unsetDataFederationSetting(kbnClient);
  }
);
