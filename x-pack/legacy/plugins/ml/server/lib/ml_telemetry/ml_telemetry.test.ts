/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMlTelemetry,
  getSavedObjectsClient,
  incrementFileDataVisualizerIndexCreationCount,
  ML_TELEMETRY_DOC_ID,
  MlTelemetry,
  storeMlTelemetry,
} from './ml_telemetry';

describe('ml_telemetry', () => {
  describe('createMlTelemetry', () => {
    it('should create a MlTelemetry object', () => {
      const mlTelemetry = createMlTelemetry(1);
      expect(mlTelemetry.file_data_visualizer.index_creation_count).toBe(1);
    });
    it('should ignore undefined or unknown values', () => {
      const mlTelemetry = createMlTelemetry(undefined);
      expect(mlTelemetry.file_data_visualizer.index_creation_count).toBe(0);
    });
  });

  describe('storeMlTelemetry', () => {
    let elasticsearchPlugin: any;
    let savedObjects: any;
    let mlTelemetry: MlTelemetry;
    let savedObjectsClientInstance: any;

    beforeEach(() => {
      savedObjectsClientInstance = { create: jest.fn() };
      const callWithInternalUser = jest.fn();
      const internalRepository = jest.fn();
      elasticsearchPlugin = {
        getCluster: jest.fn(() => ({ callWithInternalUser })),
      };
      savedObjects = {
        SavedObjectsClient: jest.fn(() => savedObjectsClientInstance),
        getSavedObjectsRepository: jest.fn(() => internalRepository),
      };
      mlTelemetry = {
        file_data_visualizer: {
          index_creation_count: 1,
        },
      };
    });

    it('should call savedObjectsClient create with the given MlTelemetry object', () => {
      storeMlTelemetry(elasticsearchPlugin, savedObjects, mlTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toBe(mlTelemetry);
    });

    it('should call savedObjectsClient create with the ml-telemetry document type and ID', () => {
      storeMlTelemetry(elasticsearchPlugin, savedObjects, mlTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('ml-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][2].id).toBe(ML_TELEMETRY_DOC_ID);
    });

    it('should call savedObjectsClient create with overwrite: true', () => {
      storeMlTelemetry(elasticsearchPlugin, savedObjects, mlTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][2].overwrite).toBe(true);
    });
  });

  describe('getSavedObjectsClient', () => {
    let elasticsearchPlugin: any;
    let savedObjects: any;
    let savedObjectsClientInstance: any;
    let callWithInternalUser: any;
    let internalRepository: any;

    beforeEach(() => {
      savedObjectsClientInstance = { create: jest.fn() };
      callWithInternalUser = jest.fn();
      internalRepository = jest.fn();
      elasticsearchPlugin = {
        getCluster: jest.fn(() => ({ callWithInternalUser })),
      };
      savedObjects = {
        SavedObjectsClient: jest.fn(() => savedObjectsClientInstance),
        getSavedObjectsRepository: jest.fn(() => internalRepository),
      };
    });

    it('should return a SavedObjectsClient initialized with the saved objects internal repository', () => {
      const result = getSavedObjectsClient(elasticsearchPlugin, savedObjects);

      expect(result).toBe(savedObjectsClientInstance);
      expect(savedObjects.SavedObjectsClient).toHaveBeenCalledWith(internalRepository);
    });
  });

  describe('incrementFileDataVisualizerIndexCreationCount', () => {
    let elasticsearchPlugin: any;
    let savedObjects: any;
    let savedObjectsClientInstance: any;
    let callWithInternalUser: any;
    let internalRepository: any;

    function createSavedObjectsClientInstance(
      telemetryEnabled?: boolean,
      indexCreationCount?: number
    ) {
      return {
        create: jest.fn(),
        get: jest.fn(obj => {
          switch (obj) {
            case 'telemetry':
              if (telemetryEnabled === undefined) {
                throw Error;
              }
              return {
                attributes: {
                  enabled: telemetryEnabled,
                },
              };
            case 'ml-telemetry':
              // emulate that a non-existing saved object will throw an error
              if (indexCreationCount === undefined) {
                throw Error;
              }
              return {
                attributes: {
                  file_data_visualizer: {
                    index_creation_count: indexCreationCount,
                  },
                },
              };
          }
        }),
      };
    }

    function mockInit(telemetryEnabled?: boolean, indexCreationCount?: number): void {
      savedObjectsClientInstance = createSavedObjectsClientInstance(
        telemetryEnabled,
        indexCreationCount
      );
      callWithInternalUser = jest.fn();
      internalRepository = jest.fn();
      savedObjects = {
        SavedObjectsClient: jest.fn(() => savedObjectsClientInstance),
        getSavedObjectsRepository: jest.fn(() => internalRepository),
      };
      elasticsearchPlugin = {
        getCluster: jest.fn(() => ({ callWithInternalUser })),
      };
    }

    it('should not increment if telemetry status cannot be determined', async () => {
      mockInit();
      await incrementFileDataVisualizerIndexCreationCount(elasticsearchPlugin, savedObjects);

      expect(savedObjectsClientInstance.create.mock.calls).toHaveLength(0);
    });

    it('should not increment if telemetry status is disabled', async () => {
      mockInit(false);
      await incrementFileDataVisualizerIndexCreationCount(elasticsearchPlugin, savedObjects);

      expect(savedObjectsClientInstance.create.mock.calls).toHaveLength(0);
    });

    it('should initialize index_creation_count with 1', async () => {
      mockInit(true);
      await incrementFileDataVisualizerIndexCreationCount(elasticsearchPlugin, savedObjects);

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('ml-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        file_data_visualizer: { index_creation_count: 1 },
      });
    });

    it('should increment index_creation_count to 2', async () => {
      mockInit(true, 1);
      await incrementFileDataVisualizerIndexCreationCount(elasticsearchPlugin, savedObjects);

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('ml-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        file_data_visualizer: { index_creation_count: 2 },
      });
    });
  });
});
