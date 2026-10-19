/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
  type WorkflowDispatchedEbtData,
} from '@kbn/alerting-v2-schemas';
import type { AnalyticsServiceStart, Logger } from '@kbn/core/server';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { EbtService } from './ebt_service';

const data: WorkflowDispatchedEbtData = {
  workflow_id: 'wf-abc123',
  action_policy_id: 'policy-1',
  workflow_execution_id: 'exec-xyz789',
  space_id: 'default',
  rule_id: ['rule-1'],
  alert_count: 1,
  rule_count: 1,
};

describe('EbtService', () => {
  let analytics: jest.Mocked<Pick<AnalyticsServiceStart, 'reportEvent'>>;
  let mockLogger: jest.Mocked<Logger>;
  let service: EbtService;

  beforeEach(() => {
    analytics = { reportEvent: jest.fn() };
    const { loggerService, mockLogger: logger } = createLoggerService();
    mockLogger = logger;
    service = new EbtService(analytics, loggerService);
  });

  describe('reportEvent', () => {
    it('reports the event through Core analytics', () => {
      service.reportEvent(WORKFLOW_DISPATCHED_EBT_EVENT_TYPE, data);

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith(WORKFLOW_DISPATCHED_EBT_EVENT_TYPE, data);
    });

    it('swallows reportEvent failures and logs them at error', () => {
      analytics.reportEvent.mockImplementationOnce(() => {
        throw new Error('analytics unavailable');
      });

      expect(() => service.reportEvent(WORKFLOW_DISPATCHED_EBT_EVENT_TYPE, data)).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const [message, meta] = mockLogger.error.mock.calls[0];
      expect(message).toBe(
        `Failed to report ${WORKFLOW_DISPATCHED_EBT_EVENT_TYPE} telemetry event`
      );
      expect(meta).toEqual({
        labels: expect.objectContaining({
          event_type: WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
          code: ALERTING_LOG_CODES.TELEMETRY_EBT_REPORT_FAILED,
        }),
        error: expect.objectContaining({
          stack_trace: expect.stringContaining('analytics unavailable'),
        }),
      });
    });
  });
});
