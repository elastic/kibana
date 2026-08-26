/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { ActionTypeRegistry } from '../../../action_type_registry';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
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
    const so = makeSavedObject('conn-1', { authMode: 'per-user', specVersion: '1.0.0' });
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
      specVersion: '1.0.0',
    });
    expect('userAuthStatus' in result).toBe(false);
  });

  it('resolves authMode to shared when authMode is undefined on the saved object', () => {
    const so = makeSavedObject('conn-2', { authMode: undefined });
    const result = connectorFromSavedObject(so, false, false);
    expect(result.authMode).toBe('shared');
  });

  it('keeps authMode shared when saved object authMode is shared', () => {
    const so = makeSavedObject('conn-3', { authMode: 'shared' });
    const result = connectorFromSavedObject(so, false, false);
    expect(result.authMode).toBe('shared');
  });

  it('uses the declarative spec ID as the public connector type', () => {
    const so = makeSavedObject('conn-4', {
      actionTypeId: '.declarative',
      specId: '.declarative-okta',
      specVersion: '1.0.0',
    });
    const result = connectorFromSavedObject(so, false, false);

    expect(result).toMatchObject({
      actionTypeId: '.declarative-okta',
      specId: '.declarative-okta',
      specVersion: '1.0.0',
    });
  });

  it('reports the active version while preserving an older pin', () => {
    const actionTypeRegistry = actionTypeRegistryMock.create();
    actionTypeRegistry.tryResolveActionType.mockReturnValue({
      registeredActionTypeId: '.declarative',
      actionType: {} as never,
      specId: '.declarative-okta',
      connectorSpec: { version: '2.0.0' } as never,
    });
    const so = makeSavedObject('conn-5', {
      actionTypeId: '.declarative',
      specId: '.declarative-okta',
      specVersion: '1.0.0',
    });

    const result = connectorFromSavedObject(
      so,
      false,
      false,
      actionTypeRegistry as unknown as ActionTypeRegistry
    );

    expect(result).toMatchObject({
      specVersion: '1.0.0',
      activeSpecVersion: '2.0.0',
    });
    expect(actionTypeRegistry.tryResolveActionType).toHaveBeenCalledWith('.declarative-okta');
  });

  it('propagates isDeprecated and isConnectorTypeDeprecated from arguments', () => {
    const so = makeSavedObject('conn-6');
    const result = connectorFromSavedObject(so, true, true);
    expect(result.isDeprecated).toBe(true);
    expect(result.isConnectorTypeDeprecated).toBe(true);
  });
});
