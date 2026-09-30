/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import type { ServiceAccountCredentialAttributes } from './credential_saved_object';
import {
  registerServiceAccountCredentialSavedObjectType,
  SERVICE_ACCOUNT_CREDENTIAL_TYPE,
} from './credential_saved_object';

describe('registerServiceAccountCredentialSavedObjectType', () => {
  const register = () => {
    const savedObjects = savedObjectsServiceMock.createSetupContract();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup();
    registerServiceAccountCredentialSavedObjectType(savedObjects, encryptedSavedObjects);
    return {
      type: savedObjects.registerType.mock.calls[0][0],
      esoType: encryptedSavedObjects.registerType.mock.calls[0][0],
    };
  };

  it('hides the type and keeps it out of import/export', () => {
    const { type } = register();

    expect(type.name).toBe(SERVICE_ACCOUNT_CREDENTIAL_TYPE);
    expect(type.hidden).toBe(true);
    expect(type.management?.importableAndExportable).toBe(false);
  });

  it('is namespace-agnostic, since Elasticsearch service accounts are cluster-scoped', () => {
    expect(register().type.namespaceType).toBe('agnostic');
  });

  it('encrypts the token and authenticates every other attribute', () => {
    const { esoType } = register();

    expect(
      [...esoType.attributesToEncrypt].map((a) => (typeof a === 'string' ? a : a.key))
    ).toEqual(['token']);
    expect([...(esoType.attributesToIncludeInAAD ?? [])].sort()).toEqual([
      'createdAt',
      'createdBy',
      'name',
      'namespace',
      'serviceAccountId',
      'tokenName',
    ]);
  });

  it('accounts for every attribute, so a new one cannot land in neither set', () => {
    // Typed, so adding a field to the interface fails to compile here until this fixture is
    // updated — at which point the assertion below forces a deliberate encrypt-or-authenticate
    // decision. An attribute in neither set would be silently rewritable in the index.
    const everyAttribute: ServiceAccountCredentialAttributes = {
      serviceAccountId: 'kibana/nightshift-relay',
      namespace: 'kibana',
      name: 'nightshift-relay',
      tokenName: 'kibana-managed',
      createdAt: '2026-09-14T00:00:00.000Z',
      createdBy: { type: 'user', username: 'elastic' },
      token: 'token',
    };

    const { esoType } = register();
    // An entry may be a bare name or `{ key, dangerouslyExposeValue }`.
    const covered = new Set<string>([
      ...[...esoType.attributesToEncrypt].map((a) => (typeof a === 'string' ? a : a.key)),
      ...(esoType.attributesToIncludeInAAD ?? []),
    ]);

    expect(Object.keys(everyAttribute).filter((attribute) => !covered.has(attribute))).toEqual([]);
  });

  it('does not map the ciphertext', () => {
    const { type } = register();

    expect(Object.keys(type.mappings.properties ?? {})).not.toContain('token');
  });

  // The binder shape is reused so that "everything this person set up" stays answerable across
  // credentials and workload bindings, which only works if the attribution is indexed.
  it('maps every `createdBy` variant, so the attribution it records is queryable', () => {
    const { type } = register();

    expect(type.mappings.properties?.createdBy).toEqual({
      dynamic: false,
      properties: {
        type: { type: 'keyword', ignore_above: 1024 },
        username: { type: 'keyword', ignore_above: 1024 },
        userProfileId: { type: 'keyword', ignore_above: 1024 },
        apiKeyId: { type: 'keyword', ignore_above: 1024 },
        variant: { type: 'keyword', ignore_above: 1024 },
        serviceAccountId: { type: 'keyword', ignore_above: 1024 },
      },
    });
  });
});
