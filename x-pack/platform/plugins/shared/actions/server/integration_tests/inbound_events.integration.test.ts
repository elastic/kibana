/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { getSupertest } from '@kbn/core-test-helpers-kbn-server';

import { INBOUND_EVENTS_API_VERSION } from '../inbound/constants';
import { setupTestServers } from './lib';

describe('Inbound events HTTP API', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  beforeAll(async () => {
    const setupResult = await setupTestServers({
      xpack: {
        actions: {
          inboundEvents: {
            enabled: true,
          },
        },
      },
    });
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

  it('serves the versioned public route and returns 404 fail-closed for unknown connector', async () => {
    await getSupertest(
      kibanaServer.root,
      'post',
      '/api/actions/events/webhook/nonexistent-connector'
    )
      .set('elastic-api-version', INBOUND_EVENTS_API_VERSION)
      .set('kbn-xsrf', 'kibana')
      .send({ hello: 'world' })
      .expect(404);
  });
});
