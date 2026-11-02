/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { createLoggerService } from '../lib/services/logger_service/logger_service.mock';
import { apiKeyPendingInvalidationMappings } from './api_key_pending_invalidation_mappings';
import { apiKeyPendingInvalidationModelVersions } from './model_versions';
import {
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  API_KEY_PENDING_INVALIDATION_TYPE,
  registerSavedObjects,
} from '.';

describe('API key saved object registration characterization', () => {
  const register = () => {
    const { loggerService } = createLoggerService();
    const savedObjects = {
      registerType: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsServiceSetup>;
    const encryptedSavedObjects = {
      registerType: jest.fn(),
    } as unknown as jest.Mocked<EncryptedSavedObjectsPluginSetup>;

    registerSavedObjects({
      savedObjects,
      encryptedSavedObjects,
      logger: loggerService.forSubsystem('savedObjects'),
    });

    return { savedObjects, encryptedSavedObjects };
  };

  it('encrypts only apiKey on action policies, bound to apiKeyOwner and apiKeyCreatedByUser', () => {
    const { encryptedSavedObjects } = register();

    expect(encryptedSavedObjects.registerType).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjects.registerType).toHaveBeenCalledWith({
      type: ACTION_POLICY_SAVED_OBJECT_TYPE,
      enforceRandomId: false,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['apiKeyOwner', 'apiKeyCreatedByUser']),
    });
  });

  it('registers the pending-invalidation type as hidden, space-agnostic and unencrypted', () => {
    const { savedObjects } = register();

    expect(savedObjects.registerType).toHaveBeenCalledWith({
      name: API_KEY_PENDING_INVALIDATION_TYPE,
      indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
      hidden: true,
      namespaceType: 'agnostic',
      mappings: apiKeyPendingInvalidationMappings,
      modelVersions: apiKeyPendingInvalidationModelVersions,
    });
    expect(API_KEY_PENDING_INVALIDATION_TYPE).toBe('alerting_api_key_pending_invalidation');
    expect(apiKeyPendingInvalidationMappings).toEqual({
      dynamic: false,
      properties: { createdAt: { type: 'date' } },
    });
  });
});
