/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import type { ActionTypeRegistry } from '../../../action_type_registry';
import { createMockInMemoryConnector } from '../mocks';
import { connectorFromInMemoryConnector } from './connector_from_in_memory_connector';

describe('connectorFromInMemoryConnector', () => {
  it('reads authType from secrets when config is not exposed', () => {
    const connector = connectorFromInMemoryConnector({
      id: 'preconfigured-connector',
      inMemoryConnector: createMockInMemoryConnector({
        isPreconfigured: true,
        config: {},
        secrets: { authType: 'relay' },
      }),
      actionTypeRegistry: actionTypeRegistryMock.create() as unknown as ActionTypeRegistry,
    });

    expect(connector.authType).toBe('relay');
    expect(connector.config).toBeUndefined();
  });
});
