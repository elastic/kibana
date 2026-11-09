/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import { AlertStatusChangedOptIns } from './alert_status_changed_opt_ins';

describe('AlertStatusChangedOptIns', () => {
  const setup = () => {
    const { loggerService, mockLogger } = createLoggerService();
    const optIns = new AlertStatusChangedOptIns(loggerService);
    const request = httpServerMock.createKibanaRequest();

    return { optIns, mockLogger, request };
  };

  describe('isEnabled', () => {
    it('returns false when nobody has opted in', async () => {
      const { optIns, request } = setup();

      await expect(optIns.isEnabled(request)).resolves.toBe(false);
    });

    it('returns true when an opt-in is enabled and passes it the request', async () => {
      const { optIns, request } = setup();
      const isEnabled = jest.fn().mockResolvedValue(true);
      optIns.register({ isEnabled });

      await expect(optIns.isEnabled(request)).resolves.toBe(true);
      expect(isEnabled).toHaveBeenCalledWith(request);
    });

    it('returns false when every opt-in says no', async () => {
      const { optIns, request } = setup();
      const first = jest.fn().mockResolvedValue(false);
      const second = jest.fn().mockResolvedValue(false);
      optIns.register({ isEnabled: first });
      optIns.register({ isEnabled: second });

      await expect(optIns.isEnabled(request)).resolves.toBe(false);
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('stops at the first opt-in that is enabled', async () => {
      const { optIns, request } = setup();
      const first = jest.fn().mockResolvedValue(true);
      const second = jest.fn().mockResolvedValue(true);
      optIns.register({ isEnabled: first });
      optIns.register({ isEnabled: second });

      await expect(optIns.isEnabled(request)).resolves.toBe(true);
      expect(second).not.toHaveBeenCalled();
    });

    it('logs a check that throws, treats it as disabled and still asks the others', async () => {
      const { optIns, mockLogger, request } = setup();
      const second = jest.fn().mockResolvedValue(true);
      optIns.register({
        isEnabled: jest.fn().mockRejectedValue(new Error('settings read failed')),
      });
      optIns.register({ isEnabled: second });

      await expect(optIns.isEnabled(request)).resolves.toBe(true);
      expect(second).toHaveBeenCalledWith(request);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'An alert status changed opt-in check failed, treating it as disabled',
        expect.objectContaining({
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_OPT_IN_FAILED,
          }),
          error: expect.objectContaining({ message: 'settings read failed' }),
        })
      );
    });

    it('returns false when every check throws', async () => {
      const { optIns, mockLogger, request } = setup();
      optIns.register({ isEnabled: jest.fn().mockRejectedValue(new Error('first')) });
      optIns.register({ isEnabled: jest.fn().mockRejectedValue(new Error('second')) });

      await expect(optIns.isEnabled(request)).resolves.toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });
  });
});
