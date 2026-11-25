/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

// Datadog is opted into receive-only: `none` saves only when every action is off.
const DATADOG_TYPE_ID = '.datadog';
const DATADOG_SITE = 'datadoghq.com';
// GitHub is a dual connector that is not opted into receive-only. `none` is not an auth type.
const GITHUB_TYPE_ID = '.github';
const GITHUB_SERVER_URL = 'https://api.githubcopilot.com/mcp/';
const EMPTY_ACTIONS_REJECTION = 'selectedActions must include at least one action when set.';
const RECEIVE_ONLY_REJECTION = 'can only receive events';

const isConnectorWithId = (value: unknown): value is { id: string } => {
  if (typeof value !== 'object' || value === null || !('id' in value)) {
    return false;
  }
  return typeof value.id === 'string';
};

apiTest.describe('Dual connectors', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];

  const rejectionMessage = async (request: Promise<unknown>): Promise<string> => {
    try {
      const created = await request;
      if (isConnectorWithId(created)) {
        createdConnectorIds.push(created.id);
      }
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    throw new Error('expected the connector request to fail');
  };

  apiTest.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
  });

  // Privileges are not under test. The shared connector service throws the 400 body this suite asserts.
  // eslint-disable-next-line @kbn/eslint/scout_require_api_client_in_api_test
  apiTest(
    'Opted into receive-only: saves a Datadog connector with no authentication only when every action is off',
    async ({ apiServices }) => {
      const created = await apiServices.alerting.connectors.create({
        name: `scout-datadog-api-receive-only-${Date.now()}`,
        connectorTypeId: DATADOG_TYPE_ID,
        config: { site: DATADOG_SITE, authType: 'none', selectedActions: [] },
        secrets: { authType: 'none' },
      });
      createdConnectorIds.push(created.id);

      const saved = await apiServices.alerting.connectors.get(created.id);
      expect(saved).toMatchObject({
        connector_type_id: DATADOG_TYPE_ID,
        config: { authType: 'none', selectedActions: [] },
      });

      const updated = await rejectionMessage(
        apiServices.alerting.connectors.update(created.id, {
          name: `scout-datadog-api-receive-only-${Date.now()}`,
          config: { site: DATADOG_SITE, authType: 'none', selectedActions: ['listMonitors'] },
          secrets: { authType: 'none' },
        })
      );
      expect(updated).toContain(RECEIVE_ONLY_REJECTION);

      const withAction = await rejectionMessage(
        apiServices.alerting.connectors.create({
          name: `scout-datadog-api-with-action-${Date.now()}`,
          connectorTypeId: DATADOG_TYPE_ID,
          config: { site: DATADOG_SITE, authType: 'none', selectedActions: ['listMonitors'] },
          secrets: { authType: 'none' },
        })
      );
      expect(withAction).toContain(RECEIVE_ONLY_REJECTION);
    }
  );

  // Privileges are not under test. The shared connector service throws the 400 body this suite asserts.
  // eslint-disable-next-line @kbn/eslint/scout_require_api_client_in_api_test
  apiTest(
    'Not opted into receive-only: rejects none and an empty action list for GitHub, and saves bearer credentials',
    async ({ apiServices }) => {
      const none = await rejectionMessage(
        apiServices.alerting.connectors.create({
          name: `scout-github-api-${Date.now()}`,
          connectorTypeId: GITHUB_TYPE_ID,
          config: { serverUrl: GITHUB_SERVER_URL },
          secrets: { authType: 'none' },
        })
      );
      expect(none).toContain('400');
      expect(none).not.toContain(RECEIVE_ONLY_REJECTION);

      const emptyActions = await rejectionMessage(
        apiServices.alerting.connectors.create({
          name: `scout-github-api-${Date.now()}`,
          connectorTypeId: GITHUB_TYPE_ID,
          config: { serverUrl: GITHUB_SERVER_URL, selectedActions: [] },
          secrets: { authType: 'bearer', token: 'ghp_scout_token' },
        })
      );
      expect(emptyActions).toContain(EMPTY_ACTIONS_REJECTION);

      const created = await apiServices.alerting.connectors.create({
        name: `scout-github-api-${Date.now()}`,
        connectorTypeId: GITHUB_TYPE_ID,
        config: { serverUrl: GITHUB_SERVER_URL, authType: 'bearer' },
        secrets: { authType: 'bearer', token: 'ghp_scout_token' },
      });
      createdConnectorIds.push(created.id);

      const saved = await apiServices.alerting.connectors.get(created.id);
      expect(saved).toMatchObject({
        connector_type_id: GITHUB_TYPE_ID,
        config: { authType: 'bearer' },
      });
      expect(saved.config.selectedActions).toBeUndefined();
    }
  );
});
