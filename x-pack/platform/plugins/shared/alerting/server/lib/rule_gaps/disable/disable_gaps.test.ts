/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { processAllGapsInTimeRange } from '../process_all_gaps_in_time_range';
import { Gap } from '../gap';
import { disableGapsBatch } from './disable_gaps_batch';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';

jest.mock('../process_all_gaps_in_time_range');
jest.mock('./disable_gaps_batch');

const endDate = new Date();
const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
jest.useFakeTimers().setSystemTime(endDate);

// Require it after faking the timers
// eslint-disable-next-line @typescript-eslint/no-var-requires
const disableGaps = require('./disable_gaps').disableGaps;

describe('disableGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogger = eventLoggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  const processAllGapsInTimeRangeMock = processAllGapsInTimeRange as jest.Mock;
  const disableGapsBatchMock = disableGapsBatch as jest.Mock;

  const gaps = [
    new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
    }),
  ];

  const ruleId = 'test-rule-id';
  beforeEach(() => {
    jest.resetAllMocks();
    processAllGapsInTimeRangeMock.mockImplementation(({ processGapsBatch }) =>
      processGapsBatch(gaps)
    );
  });

  describe('disableGaps', () => {
    it('should orchestrate the gap disable process', async () => {
      await disableGaps({
        ruleId,
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
      });

      expect(processAllGapsInTimeRangeMock).toHaveBeenCalledWith({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        ruleId: 'test-rule-id',
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        processGapsBatch: expect.any(Function),
      });
    });

    it('should pass a function that calls disableGapsBatch when gaps are fetched', async () => {
      await disableGaps({
        ruleId,
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
      });

      expect(disableGapsBatchMock).toHaveBeenCalledWith({
        gaps,
        alertingEventLogger: expect.any(AlertingEventLogger),
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
      });
    });

    it('should log an error when disable gaps is not successful', async () => {
      disableGapsBatchMock.mockResolvedValue(false);
      await disableGaps({
        ruleId,
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to disable gaps for rule test-rule-id from: ${startDate.toISOString()} to: ${endDate.toISOString()}: Some gaps failed to disable`
      );
    });
  });
});
