/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '../../../common';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { getRegisteredSpec } from './get_registered_spec';

const catalogOnly = {
  metadata: {
    id: '.catalog-only',
    displayName: 'Catalog Only',
    description: 'Runtime-registered spec',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: null,
  schema: null,
  actions: {},
  test: { handler: async () => ({}), enabled: true },
} as unknown as ConnectorSpec;

const catalogRow: ActionType = {
  id: '.catalog-only',
  name: 'Catalog Only',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: [],
  isSystemActionType: false,
  source: ACTION_TYPE_SOURCES.spec,
  isDeprecated: false,
};

const serverLogRow: ActionType = {
  id: '.server-log',
  name: 'Server log',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: ['alerting'],
  isSystemActionType: false,
  source: ACTION_TYPE_SOURCES.stack,
  isDeprecated: false,
};

describe('getRegisteredSpec', () => {
  const actionTypeRegistry = actionTypeRegistryMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    actionTypeRegistry.getSpec.mockImplementation((id: string) =>
      id === catalogOnly.metadata.id ? catalogOnly : undefined
    );
    actionTypeRegistry.list.mockReturnValue([catalogRow, serverLogRow]);
  });

  it('rejects with 404 when the connector type is unknown', () => {
    try {
      getRegisteredSpec(actionTypeRegistry, '__no_such_spec_connector__');
      throw new Error('expected getRegisteredSpec to throw');
    } catch (error) {
      expect(error).toMatchObject({ output: { statusCode: 404 } });
    }
  });

  it('rejects with 404 for a classic connector type without a spec', () => {
    try {
      getRegisteredSpec(actionTypeRegistry, '.server-log');
      throw new Error('expected getRegisteredSpec to throw');
    } catch (error) {
      expect(error).toMatchObject({ output: { statusCode: 404 } });
    }
  });

  it('returns the spec and registry list row for a spec-backed id', () => {
    const registered = getRegisteredSpec(actionTypeRegistry, '.catalog-only');
    expect(registered.spec).toBe(catalogOnly);
    expect(registered.type).toEqual(catalogRow);
  });
});
