/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { z as z4 } from '@kbn/zod/v4';
import type { ActionType } from '../../common';
import type { ActionTypeRegistry } from '../action_type_registry';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { UnsecuredSpecsClient } from './unsecured_specs_client';
import { createActionType, createSpec } from './test_utils';

const actionTypeRegistry = actionTypeRegistryMock.create();

const catalogOnly = createSpec({
  metadata: {
    id: '.catalog-only',
    displayName: 'Catalog Only',
    description: 'Runtime-registered spec',
    minimumLicense: 'basic',
    supportedFeatureIds: ['workflows'],
  },
  auth: null,
  schema: null,
  actions: {
    catalogAction: {
      scope: 'read',
      input: z4.object({}),
      handler: async () => ({}),
    },
  },
  test: { handler: async () => ({}), enabled: true },
});

const specsById: Record<string, ConnectorSpec> = {
  [catalogOnly.metadata.id]: catalogOnly,
};

const catalogRow: ActionType = createActionType(catalogOnly.metadata.id, {
  name: catalogOnly.metadata.displayName,
  minimumLicenseRequired: catalogOnly.metadata.minimumLicense,
  supportedFeatureIds: catalogOnly.metadata.supportedFeatureIds,
  source: ACTION_TYPE_SOURCES.spec,
});

const serverLogRow = createActionType('.server-log', {
  name: 'Server log',
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: ['alerting'],
  source: ACTION_TYPE_SOURCES.stack,
});

const configurationUtilities = {
  getWebhookSettings: () => ({ ssl: { pfx: { enabled: true } } }),
  isEarsEnabled: () => false,
  isEarsExperimentalEnabled: () => false,
} as unknown as ActionsConfigurationUtilities;

const createClient = () =>
  new UnsecuredSpecsClient({
    actionTypeRegistry: actionTypeRegistry as unknown as ActionTypeRegistry,
    configurationUtilities,
  });

describe('UnsecuredSpecsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actionTypeRegistry.getSpec.mockImplementation((id: string) => specsById[id]);
    actionTypeRegistry.list.mockReturnValue([catalogRow, serverLogRow]);
  });

  describe('get', () => {
    it('returns detail for a spec-backed type without any authorization', async () => {
      const detail = await createClient().get({ id: '.catalog-only' });
      expect(detail.id).toBe('.catalog-only');
      expect(detail.actions).toHaveLength(1);
      expect(actionTypeRegistry.getSpec).toHaveBeenCalledWith('.catalog-only');
    });

    it('rejects with 404 when the connector type is unknown', async () => {
      await expect(createClient().get({ id: '__no_such_spec_connector__' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('rejects with 404 for a classic connector type without a spec', async () => {
      await expect(createClient().get({ id: '.server-log' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('getAll', () => {
    it('returns summaries for spec-backed types only', async () => {
      const summaries = await createClient().getAll();
      expect(summaries.map((summary) => summary.id)).toEqual(['.catalog-only']);
    });

    it('passes featureId through to the registry list', async () => {
      await createClient().getAll({ featureId: 'workflows' });
      expect(actionTypeRegistry.list).toHaveBeenCalledWith({ featureId: 'workflows' });
    });
  });
});
