/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { getSupertest } from '@kbn/core-test-helpers-kbn-server';

import { INBOUND_EVENTS_API_VERSION, INBOUND_EVENTS_DISABLED_MESSAGE } from '../inbound/constants';
import { setupTestServers } from './lib';

describe('Inbound events HTTP API', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  beforeAll(async () => {
    // Default kill switch (enabled: false) — proves versioned public routing over HTTP.
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('returns 403 when inbound events are disabled', async () => {
    const response = await getSupertest(
      kibanaServer.root,
      'post',
      '/api/events/webhook/nonexistent-connector'
    )
      .set('elastic-api-version', INBOUND_EVENTS_API_VERSION)
      .set('x-elastic-internal-origin', 'kibana')
      .set('kbn-xsrf', 'kibana')
      .send({ hello: 'world' })
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: INBOUND_EVENTS_DISABLED_MESSAGE,
      })
    );
  });
});
