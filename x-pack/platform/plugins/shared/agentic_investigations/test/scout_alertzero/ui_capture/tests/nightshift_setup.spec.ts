/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test } from '@kbn/scout';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { setUpNightshiftServiceAccount } from '../../../../../../../../solutions/observability/plugins/nightshift_investigations/test/scout_nightshift_investigations/api/fixtures/service_account';

// Run once against `--serverConfigSet nightshift_investigations`, before
// `seed_nightshift_investigations.ts`: the investigation agent is only available in a space whose
// investigation workflow is bound to the Nightshift service account.
test.describe('Nightshift — space setup for captures', { tag: tags.stateful.classic }, () => {
  test('sets up the default space to run investigations', async ({
    kbnUrl,
    esClient,
    samlAuth,
    log,
    config,
  }) => {
    test.setTimeout(180_000);
    await setUpNightshiftServiceAccount({
      kbnUrl,
      esClient,
      samlAuth,
      isServerless: config.serverless,
      log,
    });
  });
});
