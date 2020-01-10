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
      const actionsTelemetry = createActionsTelemetry(1);
      expect(actionsTelemetry.executions_total).toBe(1);
    });
    it('should ignore undefined or unknown values', () => {
      const actionsTelemetry = createActionsTelemetry(undefined);
      expect(actionsTelemetry.executions_total).toBe(0);
    });
  });

  describe('storeActionsTelemetry', () => {
    let actionsTelemetry: ActionsTelemetry;
    let savedObjectsClientInstance: any;

    beforeEach(() => {
      savedObjectsClientInstance = { create: jest.fn() };
      actionsTelemetry = {
        executions_total: 1,
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
                  executions_total: executionsTotal,
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

    it('should initialize executions_total with 1 and excutions_count_by_type with proper key value pair', async () => {
      mockInit(true, 0);
      await incrementActionExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('actions-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        executions_total: 1,
        excutions_count_by_type: { test: 1 },
      });
    });

    it('should increment index_creation_count to 2', async () => {
      mockInit(true, 1);
      await incrementActionExecutionsCount(savedObjectsClientInstance, 'some');
      await incrementActionExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('actions-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        executions_total: 2,
        excutions_count_by_type: { some: 1, test: 1 },
      });
    });
  });
});
