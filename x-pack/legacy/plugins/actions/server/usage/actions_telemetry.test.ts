/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createActionsTelemetry,
  incrementActionExecutionsCount,
  ACTIONS_TELEMETRY_DOC_ID,
  storeActionsTelemetry,
} from './actions_telemetry';
import { ActionsTelemetry } from './types';

describe('actions_telemetry', () => {
  describe('createActionsTelemetry', () => {
    it('should create a ActionsTelemetry object', () => {
      const actionsTelemetry = createActionsTelemetry({ foo: 1 });
      expect(actionsTelemetry.excutions_count_by_type.foo).toBe(1);
    });
    it('should ignore undefined or unknown values', () => {
      const actionsTelemetry = createActionsTelemetry();
      expect(Object.entries(actionsTelemetry.excutions_count_by_type).length).toBe(0);
    });
  });

  describe('storeActionsTelemetry', () => {
    let actionsTelemetry: ActionsTelemetry;
    let savedObjectsClientInstance: any;

    beforeEach(() => {
      savedObjectsClientInstance = { create: jest.fn() };
      actionsTelemetry = {
        excutions_count_by_type: {},
      };
    });

    it('should call savedObjectsClient create with the given ActionsTelemetry object', () => {
      storeActionsTelemetry(savedObjectsClientInstance, actionsTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toBe(actionsTelemetry);
    });

    it('should call savedObjectsClient create with the actions-telemetry document type and ID', () => {
      storeActionsTelemetry(savedObjectsClientInstance, actionsTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('actions-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][2].id).toBe(ACTIONS_TELEMETRY_DOC_ID);
    });

    it('should call savedObjectsClient create with overwrite: true', () => {
      storeActionsTelemetry(savedObjectsClientInstance, actionsTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][2].overwrite).toBe(true);
    });
  });

  describe('incrementActionExecutionsCount', () => {
    let savedObjectsClientInstance: any;

    function createSavedObjectsClientInstance(
      telemetryEnabled?: boolean,
      executionsTotal?: number
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
            case 'actions-telemetry':
              // emulate that a non-existing saved object will throw an error
              if (executionsTotal === undefined) {
                throw Error;
              }
              return {
                attributes: {
                  excutions_count_by_type: { test: executionsTotal },
                },
              };
          }
        }),
      };
    }

    function mockInit(telemetryEnabled?: boolean, executionsTotal?: number): void {
      savedObjectsClientInstance = createSavedObjectsClientInstance(
        telemetryEnabled,
        executionsTotal
      );
    }

    it('should not increment if telemetry status cannot be determined', async () => {
      mockInit();
      await incrementActionExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls).toHaveLength(0);
    });

    it('should not increment if telemetry status is disabled', async () => {
      mockInit(false);
      await incrementActionExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls).toHaveLength(0);
    });

    it('should initialize excutions_count_by_type with proper key value pair', async () => {
      mockInit(true, 0);
      await incrementActionExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('actions-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        excutions_count_by_type: { test: 1 },
      });
    });

    it('should increment proper excutions_count_by_type action types executions', async () => {
      mockInit(true, 1);
      await incrementActionExecutionsCount(savedObjectsClientInstance, 'some');
      await incrementActionExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('actions-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        excutions_count_by_type: { some: 1, test: 1 },
      });
    });
  });
});
