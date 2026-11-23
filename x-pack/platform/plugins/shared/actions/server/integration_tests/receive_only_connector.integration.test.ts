/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsSpecs } from '@kbn/connector-specs';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { getSupertest } from '@kbn/core-test-helpers-kbn-server';

import { setupTestServers } from './lib';

const DATADOG_CONNECTOR_TYPE_ID = connectorsSpecs.Datadog.metadata.id;
const RECEIVE_ONLY_REJECTION = 'can only receive events';

interface ConnectorHttpBody {
  id: string;
  connector_type_id: string;
}

interface ErrorHttpBody {
  message?: string;
}

describe('Receive-only dual connector', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  beforeAll(async () => {
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

  const createDatadog = (selectedActions: string[]) =>
    getSupertest(kibanaServer.root, 'post', '/api/actions/connector')
      .set('kbn-xsrf', 'kibana')
      .send({
        name: 'datadog-receive-only',
        connector_type_id: DATADOG_CONNECTOR_TYPE_ID,
        config: { site: 'datadoghq.com', selectedActions },
        secrets: { authType: 'none' },
      });

  it('creates a Datadog connector with no authentication when every action is off', async () => {
    const createRes = await createDatadog([]).expect(
      (res: { status: number; body: unknown }) => {
        if (res.status !== 200) {
          throw new Error(`create connector failed ${res.status}: ${JSON.stringify(res.body)}`);
        }
      }
    );

    const created = createRes.body as ConnectorHttpBody;
    expect(created.id).toEqual(expect.any(String));
    expect(created.connector_type_id).toBe(DATADOG_CONNECTOR_TYPE_ID);

    const updateRes = await getSupertest(
      kibanaServer.root,
      'put',
      `/api/actions/connector/${created.id}`
    )
      .set('kbn-xsrf', 'kibana')
      .send({
        name: 'datadog-receive-only',
        config: { site: 'datadoghq.com', selectedActions: ['listMonitors'] },
        secrets: { authType: 'none' },
      });

    expect(updateRes.status).toBe(400);
    expect((updateRes.body as ErrorHttpBody).message).toEqual(
      expect.stringContaining(RECEIVE_ONLY_REJECTION)
    );
  });

  it('rejects a Datadog connector with no authentication and a selected action', async () => {
    const createRes = await createDatadog(['listMonitors']);

    expect(createRes.status).toBe(400);
    expect((createRes.body as ErrorHttpBody).message).toEqual(
      expect.stringContaining(RECEIVE_ONLY_REJECTION)
    );
  });
});
