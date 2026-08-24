/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import { actionsConfigMock } from '../../actions_config.mock';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import {
  createConnectorTypeFromSpecProvider,
  type ConnectorSpecProvider,
} from './create_connector_from_spec_provider';

const createSpec = (version: string, field: string): ConnectorSpec => ({
  version,
  metadata: {
    id: '.declarative-test',
    displayName: 'Declarative Test',
    description: 'Test connector',
    minimumLicense: 'basic',
    supportedFeatureIds: ['workflows'],
  },
  schema: z.object({ [field]: z.string() }).strict(),
  auth: { types: ['none'] },
  actions: {
    run: {
      input: z.object({ [field]: z.string() }).strict(),
      handler: jest.fn(),
    },
  },
  test: { enabled: false, handler: jest.fn() },
});

describe('createConnectorTypeFromSpecProvider', () => {
  const currentSpec = createSpec('2.0.0', 'current');
  const historicalSpec = createSpec('1.0.0', 'historical');
  const provider: ConnectorSpecProvider = {
    metadata: currentSpec.metadata,
    getCurrentSpec: () => currentSpec,
    getSpecs: () => [currentSpec, historicalSpec],
    getSpec: async (version) => (version === historicalSpec.version ? historicalSpec : currentSpec),
  };
  const actions = {
    getActionsConfigurationUtilities: () => actionsConfigMock.create(),
    getAxiosInstanceWithAuth: jest.fn(),
    getCredential: jest.fn(),
    getClientLeasePool: jest.fn(),
  } as unknown as ActionsPluginSetupContract;

  it('uses only the active specification for connector creation', () => {
    const connectorType = createConnectorTypeFromSpecProvider(provider, actions);

    expect(connectorType.validate.config.schema.parse({ current: 'value' })).toEqual({
      current: 'value',
    });
    expect(() => connectorType.validate.config.schema.parse({ historical: 'value' })).toThrow();
  });

  it('builds execution validation from the pinned specification', async () => {
    const connectorType = createConnectorTypeFromSpecProvider(provider, actions);
    const validation = await connectorType.getConnectorValidation?.('1.0.0');

    expect(validation?.config.schema.parse({ historical: 'value' })).toEqual({
      historical: 'value',
    });
    expect(() => validation?.config.schema.parse({ current: 'value' })).toThrow();
    expect(
      validation?.params?.schema.parse({ subAction: 'run', subActionParams: { historical: 'v' } })
    ).toEqual({
      subAction: 'run',
      subActionParams: { historical: 'v' },
    });
  });
});
