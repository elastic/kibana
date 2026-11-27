/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { ALERTING_LOG_CODES } from '../lib/errors/error_codes';
import { createLoggerService } from '../lib/services/logger_service/logger_service.mock';
import {
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  API_KEY_PENDING_INVALIDATION_TYPE,
  EXTERNAL_SOURCE_SAVED_OBJECT_TYPE,
  registerSavedObjects,
  RULE_SAVED_OBJECT_TYPE,
} from '.';
import { externalSourceMappings } from './external_source_mappings';
import { externalSourceModelVersions } from './model_versions';

describe('registerSavedObjects', () => {
  const createDeps = () => {
    const { loggerService, mockLogger } = createLoggerService();
    const savedObjects = {
      registerType: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsServiceSetup>;
    const encryptedSavedObjects = {
      registerType: jest.fn(),
    } as unknown as jest.Mocked<EncryptedSavedObjectsPluginSetup>;

    return {
      logger: loggerService.forSubsystem('savedObjects'),
      mockLogger,
      savedObjects,
      encryptedSavedObjects,
    };
  };

  it('registers the rule, action policy, external source, API-key, and ESO types', () => {
    const { logger, savedObjects, encryptedSavedObjects } = createDeps();

    registerSavedObjects({ savedObjects, encryptedSavedObjects, logger });

    expect(savedObjects.registerType).toHaveBeenCalledTimes(4);
    expect(savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ name: RULE_SAVED_OBJECT_TYPE })
    );
    expect(savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ name: ACTION_POLICY_SAVED_OBJECT_TYPE })
    );
    expect(savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ name: EXTERNAL_SOURCE_SAVED_OBJECT_TYPE })
    );
    expect(savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ name: API_KEY_PENDING_INVALIDATION_TYPE })
    );
    expect(encryptedSavedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ type: ACTION_POLICY_SAVED_OBJECT_TYPE })
    );
  });

  it('registers external sources as hidden, space-isolated and not importable', () => {
    const { logger, savedObjects, encryptedSavedObjects } = createDeps();

    registerSavedObjects({ savedObjects, encryptedSavedObjects, logger });

    expect(savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({
        name: EXTERNAL_SOURCE_SAVED_OBJECT_TYPE,
        hidden: true,
        namespaceType: 'multiple-isolated',
        mappings: externalSourceMappings,
        modelVersions: externalSourceModelVersions,
        management: expect.objectContaining({ importableAndExportable: false }),
      })
    );
  });

  it('titles an external source by its name', () => {
    const { logger, savedObjects, encryptedSavedObjects } = createDeps();

    registerSavedObjects({ savedObjects, encryptedSavedObjects, logger });

    const externalSourceType = (savedObjects.registerType as jest.Mock).mock.calls
      .map(([type]) => type)
      .find(({ name }) => name === EXTERNAL_SOURCE_SAVED_OBJECT_TYPE);

    expect(
      externalSourceType.management.getTitle({ attributes: { metadata: { name: 'Prod' } } })
    ).toBe('External source: [Prod]');
  });

  it('logs SAVED_OBJECTS_TYPE_REGISTRATION_FAILED and rethrows when a type fails to register', () => {
    const { logger, mockLogger, savedObjects, encryptedSavedObjects } = createDeps();
    const failure = new Error('boom');
    (savedObjects.registerType as jest.Mock)
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw failure;
      });

    expect(() => registerSavedObjects({ savedObjects, encryptedSavedObjects, logger })).toThrow(
      failure
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Saved object type failed to register',
      expect.objectContaining({
        labels: {
          code: ALERTING_LOG_CODES.SAVED_OBJECTS_TYPE_REGISTRATION_FAILED,
          resource: ACTION_POLICY_SAVED_OBJECT_TYPE,
        },
        error: expect.objectContaining({
          message: 'Saved object type failed to register',
          stack_trace: expect.stringContaining('boom'),
        }),
      })
    );
  });
});
