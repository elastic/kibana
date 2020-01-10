/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createAlertsTelemetry,
  incrementAlertsExecutionsCount,
  ALERTS_TELEMETRY_DOC_ID,
  storeAlertsTelemetry,
} from './alerts_telemetry';
import { AlertsTelemetry } from './types';

describe('alerts_telemetry', () => {
  describe('createAlertsTelemetry', () => {
    it('should create a AlertsTelemetry object', () => {
      const alertsTelemetry = createAlertsTelemetry(1);
      expect(alertsTelemetry.executions_total).toBe(1);
    });
    it('should ignore undefined or unknown values', () => {
      const alertsTelemetry = createAlertsTelemetry(undefined);
      expect(alertsTelemetry.executions_total).toBe(0);
    });
  });

  describe('storeAlertsTelemetry', () => {
    let alertsTelemetry: AlertsTelemetry;
    let savedObjectsClientInstance: any;

    beforeEach(() => {
      savedObjectsClientInstance = { create: jest.fn() };
      alertsTelemetry = {
        executions_total: 1,
        excutions_count_by_type: {},
      };
    });

    it('should call savedObjectsClient create with the given AlertsTelemetry object', () => {
      storeAlertsTelemetry(savedObjectsClientInstance, alertsTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toBe(alertsTelemetry);
    });

    it('should call savedObjectsClient create with the alerts-telemetry document type and ID', () => {
      storeAlertsTelemetry(savedObjectsClientInstance, alertsTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('alerts-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][2].id).toBe(ALERTS_TELEMETRY_DOC_ID);
    });

    it('should call savedObjectsClient create with overwrite: true', () => {
      storeAlertsTelemetry(savedObjectsClientInstance, alertsTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][2].overwrite).toBe(true);
    });
  });

  describe('incrementAlertExecutionsCount', () => {
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
            case 'alerts-telemetry':
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
      await incrementAlertsExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls).toHaveLength(0);
    });

    it('should not increment if telemetry status is disabled', async () => {
      mockInit(false);
      await incrementAlertsExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls).toHaveLength(0);
    });

    it('should initialize executions_total with 1 and excutions_count_by_type with proper key value pair', async () => {
      mockInit(true, 0);
      await incrementAlertsExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('alerts-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        executions_total: 1,
        excutions_count_by_type: { test: 1 },
      });
    });

    it('should increment index_creation_count to 2', async () => {
      mockInit(true, 1);
      await incrementAlertsExecutionsCount(savedObjectsClientInstance, 'some');
      await incrementAlertsExecutionsCount(savedObjectsClientInstance, 'test');

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('alerts-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        executions_total: 2,
        excutions_count_by_type: { some: 1, test: 1 },
      });
    });
  });
});
