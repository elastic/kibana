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
import { softDeleteGapsBatch } from './soft_delete_gaps_batch';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import { softDeleteGaps } from './soft_delete_gaps';
import { gapStatus } from '../../../../common/constants';

jest.mock('../process_all_rule_gaps');
jest.mock('./soft_delete_gaps_batch');

describe('softDeleteGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogger = eventLoggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  const processAllRuleGapsMock = processAllRuleGaps as jest.Mock;
  const softDeleteGapsBatchMock = softDeleteGapsBatch as jest.Mock;

  const ruleId = 'test-rule-id';
  const gaps = [
    new Gap({
      ruleId,
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
    }),
  ];

  let processGapsBatchResult = {};

  beforeEach(() => {
    jest.resetAllMocks();
    processAllRuleGapsMock.mockImplementation(async ({ processGapsBatch }) => {
      processGapsBatchResult = await processGapsBatch(gaps);
      return processGapsBatchResult;
    });
  });

  describe('softDeleteGaps', () => {
    it('should orchestrate the gap disable process', async () => {
      await softDeleteGaps({
        ruleIds: [ruleId],
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
      });

      expect(processAllRuleGapsMock).toHaveBeenCalledWith({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        ruleIds: ['test-rule-id'],
        processGapsBatch: expect.any(Function),
        statuses: Object.values(gapStatus),
      });
    });

    it('should pass a function that calls softDeleteGapsBatch when gaps are fetched', async () => {
      await softDeleteGaps({
        ruleIds: [ruleId],
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
      });

      expect(softDeleteGapsBatchMock).toHaveBeenCalledWith({
        gaps,
        alertingEventLogger: expect.any(AlertingEventLogger),
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
      });
    });

    it('should log an error when disable gaps is not successful', async () => {
      softDeleteGapsBatchMock.mockResolvedValue(false);
      await softDeleteGaps({
        ruleIds: [ruleId],
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to soft delete gaps for rules test-rule-id: Some gaps failed to soft delete`
      );
    });

    describe('processGapsBatch function', () => {
      it('should return a record with the count of processed gaps per rule', () => {
        expect(processGapsBatchResult).toEqual({
          [ruleId]: 1,
        });
      });
    });
  });
});
