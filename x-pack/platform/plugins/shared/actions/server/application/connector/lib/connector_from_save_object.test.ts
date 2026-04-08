/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { RawAction } from '../../../types';
import { connectorFromSavedObject } from './connector_from_save_object';

function makeSavedObject(id: string, overrides: Partial<RawAction> = {}): SavedObject<RawAction> {
  return {
    id,
    type: 'action',
    attributes: {
      actionTypeId: '.test',
      name: 'Test connector',
      isMissingSecrets: false,
      config: {},
      secrets: {},
      ...overrides,
    },
    references: [],
  };
}

describe('connectorFromSavedObject', () => {
  it('maps saved object fields and resolved auth mode', () => {
    const so = makeSavedObject('conn-1', { authMode: 'per-user' });
    const result = connectorFromSavedObject(so, false, false);
    expect(result).toMatchObject({
      id: 'conn-1',
      actionTypeId: '.test',
      name: 'Test connector',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
      authMode: 'per-user',
    });
    expect('userAuthStatus' in result).toBe(false);
  });
});
