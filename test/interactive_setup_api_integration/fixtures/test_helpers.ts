/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../ftr_provider_context';

export async function hasKibanaBooted(context: FtrProviderContext) {
  const supertest = context.getService('supertest');
  const log = context.getService('log');

  // Run 30 consecutive requests with 1.5s delay to check if Kibana is up and running.
  let kibanaHasBooted = false;
  for (const counter of [...Array(30).keys()]) {
    await setTimeoutAsync(1500);

    try {
      expect((await supertest.get('/api/status').expect(200)).body).to.have.keys([
        'version',
        'status',
      ]);

      log.debug(`Kibana has booted after ${(counter + 1) * 1.5}s.`);
      kibanaHasBooted = true;
      break;
    } catch (err) {
      log.debug(`Kibana is still booting after ${(counter + 1) * 1.5}s due to: ${err.message}`);
    }
  }

  return kibanaHasBooted;
}
