/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_CREATED_EBT_EVENT_TYPE,
  type RuleChangedEbtData,
} from '../../telemetry/rule_ebt_schema';
import type { AnalyticsServiceStart, Logger } from '@kbn/core/server';
import { analyticsServiceMock } from '@kbn/core/server/mocks';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { EbtService } from './ebt_service';

const data: RuleChangedEbtData = {
  rule_id: 'rule-1',
  created_at: '2026-10-12T22:05:11.352Z',
  kind: 'alert',
  enabled: true,
  origin: { actor: 'user', channel: 'api' },
};

describe('EbtService', () => {
  let analytics: jest.Mocked<AnalyticsServiceStart>;
  let mockLogger: jest.Mocked<Logger>;
  let service: EbtService;

  beforeEach(() => {
    analytics = analyticsServiceMock.createAnalyticsServiceStart();
    const { loggerService, mockLogger: logger } = createLoggerService();
    mockLogger = logger;
    service = new EbtService(analytics, loggerService);
  });

  describe('reportEvent', () => {
    it('reports the event through Core analytics', () => {
      service.reportEvent(RULE_CREATED_EBT_EVENT_TYPE, data);

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith(RULE_CREATED_EBT_EVENT_TYPE, data);
    });

    it('swallows reportEvent failures and logs them at error', () => {
      analytics.reportEvent.mockImplementationOnce(() => {
        throw new Error('analytics unavailable');
      });

      expect(() => service.reportEvent(RULE_CREATED_EBT_EVENT_TYPE, data)).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const [message, meta] = mockLogger.error.mock.calls[0];
      expect(message).toBe(`Failed to report ${RULE_CREATED_EBT_EVENT_TYPE} telemetry event`);
      expect(meta).toEqual({
        labels: expect.objectContaining({
          event_type: RULE_CREATED_EBT_EVENT_TYPE,
          code: ALERTING_LOG_CODES.TELEMETRY_EBT_REPORT_FAILED,
        }),
        error: expect.objectContaining({
          stack_trace: expect.stringContaining('analytics unavailable'),
        }),
      });
    });
  });
});
