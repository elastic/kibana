/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { callKibana } from '@kbn/task-manager-plugin/server/task_pod';
import { createLoggerService } from '../lib/services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../lib/errors/error_codes';
import {
  RemoteAlertStatusChangedOptIns,
  createAlertStatusChangedHandlers,
} from './alert_status_changed';

jest.mock('@kbn/task-manager-plugin/server/task_pod', () => ({ callKibana: jest.fn() }));

const callKibanaMock = callKibana as jest.MockedFunction<typeof callKibana>;

describe('alert status changed pod contract', () => {
  const request = httpServerMock.createKibanaRequest();

  beforeEach(() => jest.clearAllMocks());

  describe('RemoteAlertStatusChangedOptIns', () => {
    const setup = () => {
      const { loggerService, mockLogger } = createLoggerService();
      return { optIns: new RemoteAlertStatusChangedOptIns(loggerService), mockLogger };
    };

    it.each([true, false])('asks Kibana and returns its answer (%s)', async (answer) => {
      callKibanaMock.mockResolvedValue(answer);
      const { optIns } = setup();

      await expect(optIns.isEnabled(request)).resolves.toBe(answer);
      expect(callKibanaMock).toHaveBeenCalledWith('alertingVTwo.alertStatusChanged', 'isEnabled', [
        request,
      ]);
    });

    it('treats a failed call as not enabled and logs it', async () => {
      callKibanaMock.mockRejectedValue(new Error('kibana is down'));
      const { optIns, mockLogger } = setup();

      await expect(optIns.isEnabled(request)).resolves.toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'An alert status changed opt-in check failed, treating it as disabled',
        expect.objectContaining({
          error: expect.objectContaining({ message: 'kibana is down' }),
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_OPT_IN_FAILED,
          }),
        })
      );
    });
  });

  describe('createAlertStatusChangedHandlers', () => {
    it("runs Kibana's registered opt-ins for the request the pod sent", async () => {
      const isEnabled = jest.fn().mockResolvedValue(true);
      const handlers = createAlertStatusChangedHandlers(() => ({ isEnabled }));

      await expect(handlers.isEnabled({} as never, request)).resolves.toBe(true);
      expect(isEnabled).toHaveBeenCalledWith(request);
    });
  });
});
