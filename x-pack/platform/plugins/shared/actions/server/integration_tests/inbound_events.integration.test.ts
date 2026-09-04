/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { getSupertest } from '@kbn/core-test-helpers-kbn-server';

import { buildInboundEventsPath } from '../../common/inbound_events';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../common';
import { INBOUND_EVENTS_API_VERSION } from '../inbound/constants';
import { setupTestServers } from './lib';

interface ConnectorHttpBody {
  id: string;
  connector_type_id: string;
  config?: { ingestTokenHash?: string };
  secrets?: { ingest_token?: string };
}

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

  const postHub = (
    connectorId: string,
    token: string,
    body: Record<string, unknown> = { eventType: 'order.created', orderId: '1' }
  ) =>
    getSupertest(
      kibanaServer.root,
      'post',
      buildInboundEventsPath({
        connectorTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
        connectorId,
      })
    )
      .set('elastic-api-version', INBOUND_EVENTS_API_VERSION)
      .set('kbn-xsrf', 'kibana')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

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

  it('creates an inbound webhook, accepts a hub POST, and rejects the old token after rotate', async () => {
    const createRes = await getSupertest(kibanaServer.root, 'post', '/api/actions/connector')
      .set('kbn-xsrf', 'kibana')
      .send({
        name: 'sales-ingress',
        connector_type_id: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
        config: {},
        secrets: { authType: 'none' },
      })
      .expect((res: { status: number; body: unknown }) => {
        if (res.status !== 200) {
          throw new Error(`create connector failed ${res.status}: ${JSON.stringify(res.body)}`);
        }
      });

    const created = createRes.body as ConnectorHttpBody;
    expect(created.id).toEqual(expect.any(String));
    expect(created.connector_type_id).toBe(INBOUND_WEBHOOK_CONNECTOR_TYPE_ID);
    expect(created.secrets).toBeUndefined();
    expect(created.config?.ingestTokenHash).toBeUndefined();

    const mintRes = await getSupertest(
      kibanaServer.root,
      'post',
      `${INTERNAL_BASE_ACTION_API_PATH}/connector/${created.id}/_rotate_event_token`
    )
      .set('kbn-xsrf', 'kibana')
      .set('x-elastic-internal-origin', 'kibana')
      .expect((res: { status: number; body: unknown }) => {
        if (res.status !== 200) {
          throw new Error(`mint ingress failed ${res.status}: ${JSON.stringify(res.body)}`);
        }
      });

    const ingestToken = (mintRes.body as { ingest_token?: string }).ingest_token;
    expect(ingestToken).toEqual(expect.any(String));

    await postHub(created.id, ingestToken!, {
      type: 'url_verification',
      challenge: 'abc',
    }).expect(200, { challenge: 'abc' });

    await postHub(created.id, ingestToken!).expect(202, { ok: true });

    const getRes = await getSupertest(
      kibanaServer.root,
      'get',
      `/api/actions/connector/${created.id}`
    )
      .set('kbn-xsrf', 'kibana')
      .expect(200);
    expect((getRes.body as ConnectorHttpBody).secrets?.ingest_token).toBeUndefined();
    expect((getRes.body as ConnectorHttpBody).config?.ingestTokenHash).toBeUndefined();

    const rotateRes = await getSupertest(
      kibanaServer.root,
      'post',
      `${INTERNAL_BASE_ACTION_API_PATH}/connector/${created.id}/_rotate_event_token`
    )
      .set('kbn-xsrf', 'kibana')
      .set('x-elastic-internal-origin', 'kibana')
      .expect((res: { status: number; body: unknown }) => {
        if (res.status !== 200) {
          throw new Error(`rotate ingress failed ${res.status}: ${JSON.stringify(res.body)}`);
        }
      });

    const rotated = rotateRes.body as { ingest_token?: string };
    const newToken = rotated.ingest_token;
    expect(newToken).toEqual(expect.any(String));
    expect(newToken).not.toBe(ingestToken);

    await postHub(created.id, ingestToken!).expect(404);
    await postHub(created.id, newToken!).expect(202, { ok: true });
  });
});
