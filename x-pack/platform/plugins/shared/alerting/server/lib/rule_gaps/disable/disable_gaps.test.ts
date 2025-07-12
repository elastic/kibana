/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { processAllRuleGaps } from '../process_all_rule_gaps';
import { Gap } from '../gap';
import { disableGapsBatch } from './disable_gaps_batch';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import { disableGaps } from './disable_gaps';

jest.mock('../process_all_rule_gaps');
jest.mock('./disable_gaps_batch');

describe('disableGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogger = eventLoggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  const processAllRuleGapsMock = processAllRuleGaps as jest.Mock;
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
    processAllRuleGapsMock.mockImplementation(({ processGapsBatch }) => processGapsBatch(gaps));
  });

  describe('disableGaps', () => {
    it('should orchestrate the gap disable process', async () => {
      await disableGaps({
        ruleId,
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
      });

      expect(processAllRuleGapsMock).toHaveBeenCalledWith({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        ruleId: 'test-rule-id',
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
        `Failed to disable gaps for rule test-rule-id: Some gaps failed to disable`
      );
    });
  });
});
