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
const GITHUB_CONNECTOR_TYPE_ID = connectorsSpecs.GithubConnector.metadata.id;
const RECEIVE_ONLY_REJECTION = 'can only receive events';
const EMPTY_ACTIONS_REJECTION = 'selectedActions must include at least one action when set.';

interface ConnectorHttpBody {
  id: string;
  connector_type_id: string;
  config?: { authType?: string; selectedActions?: string[] };
}

const isConnectorHttpBody = (body: unknown): body is ConnectorHttpBody =>
  typeof body === 'object' &&
  body !== null &&
  'id' in body &&
  typeof body.id === 'string' &&
  'connector_type_id' in body &&
  typeof body.connector_type_id === 'string';

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
    const createRes = await createDatadog([]).expect((res: { status: number; body: unknown }) => {
      if (res.status !== 200) {
        throw new Error(`create connector failed ${res.status}: ${JSON.stringify(res.body)}`);
      }
    });

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

  const createGithub = (config: Record<string, unknown>, secrets: Record<string, unknown>) =>
    getSupertest(kibanaServer.root, 'post', '/api/actions/connector')
      .set('kbn-xsrf', 'kibana')
      .send({
        name: 'github-credentialed',
        connector_type_id: GITHUB_CONNECTOR_TYPE_ID,
        config,
        secrets,
      });

  it('rejects none for a dual connector that is not opted in', async () => {
    const createRes = await createGithub(
      { serverUrl: 'https://api.githubcopilot.com/mcp/' },
      { authType: 'none' }
    );

    expect(createRes.status).toBe(400);
    expect(JSON.stringify(createRes.body)).not.toContain(RECEIVE_ONLY_REJECTION);
  });

  it('rejects an empty action list for GitHub and saves bearer credentials', async () => {
    const emptyActions = await createGithub(
      { serverUrl: 'https://api.githubcopilot.com/mcp/', selectedActions: [] },
      { authType: 'bearer', token: 'ghp_scout_token' }
    );

    expect(emptyActions.status).toBe(400);
    expect((emptyActions.body as ErrorHttpBody).message).toEqual(
      expect.stringContaining(EMPTY_ACTIONS_REJECTION)
    );

    const created = await createGithub(
      { serverUrl: 'https://api.githubcopilot.com/mcp/', authType: 'bearer' },
      { authType: 'bearer', token: 'ghp_scout_token' }
    ).expect((res: { status: number; body: unknown }) => {
      if (res.status !== 200) {
        throw new Error(`create connector failed ${res.status}: ${JSON.stringify(res.body)}`);
      }
    });

    expect(isConnectorHttpBody(created.body)).toBe(true);
    if (!isConnectorHttpBody(created.body)) {
      return;
    }
    const body = created.body;
    expect(body.connector_type_id).toBe(GITHUB_CONNECTOR_TYPE_ID);

    const getRes = await getSupertest(kibanaServer.root, 'get', `/api/actions/connector/${body.id}`)
      .set('kbn-xsrf', 'kibana')
      .expect(200);

    expect(isConnectorHttpBody(getRes.body)).toBe(true);
    if (!isConnectorHttpBody(getRes.body)) {
      return;
    }
    expect(getRes.body.config?.authType).toBe('bearer');
    expect(getRes.body.config?.selectedActions).toBeUndefined();
  });
});
