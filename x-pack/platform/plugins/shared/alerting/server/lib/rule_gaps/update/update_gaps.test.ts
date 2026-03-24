/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateGaps } from './update_gaps';
import { backfillClientMock } from '../../../backfill_client/backfill_client.mock';

import { loggerMock } from '@kbn/logging-mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { Gap } from '../gap';
import { adHocRunStatus } from '../../../../common/constants';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { processAllRuleGaps } from '../process_all_rule_gaps';
import { updateGapsBatch } from './update_gaps_batch';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import { backfillInitiator } from '../../../../common/constants';

jest.mock('../process_all_rule_gaps');
jest.mock('./update_gaps_batch');

describe('updateGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogger = eventLoggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();
  const mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const mockBackfillClient = backfillClientMock.create();
  const mockActionsClient = actionsClientMock.create();

  const processAllRuleGapsMock = processAllRuleGaps as jest.Mock;
  const updateGapsBatchMock = updateGapsBatch as jest.Mock;

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
  const backfillSchedule = [
    {
      runAt: '2024-01-01T00:30:00.000Z',
      interval: '30m',
      status: adHocRunStatus.COMPLETE,
    },
  ];

  let processGapsBatchResult = {};

  beforeEach(() => {
    jest.resetAllMocks();
    processAllRuleGapsMock.mockImplementation(async ({ processGapsBatch }) => {
      processGapsBatchResult = await processGapsBatch(gaps);
      return processGapsBatchResult;
    });
  });

  describe('updateGaps', () => {
    it('should orchestrate the gap update process', async () => {
      await updateGaps({
        ruleId,
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
        backfillSchedule,
        shouldRefetchAllBackfills: true,
        initiator: backfillInitiator.USER,
      });

      expect(processAllRuleGapsMock).toHaveBeenCalledWith({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        ruleIds: ['test-rule-id'],
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-01-01T01:00:00.000Z',
        processGapsBatch: expect.any(Function),
      });

      expect(updateGapsBatchMock).toHaveBeenCalledWith({
        gaps,
        backfillSchedule,
        savedObjectsRepository: mockSavedObjectsRepository,
        shouldRefetchAllBackfills: true,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
        logger: mockLogger,
        ruleId,
        eventLogClient: mockEventLogClient,
        alertingEventLogger: expect.any(AlertingEventLogger),
        initiator: backfillInitiator.USER,
      });
    });

    it('should skip fetching gaps when they are passed in as a param', async () => {
      await updateGaps({
        ruleId,
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
        gaps,
        backfillSchedule,
        shouldRefetchAllBackfills: true,
        initiator: backfillInitiator.USER,
      });
      expect(processAllRuleGapsMock).not.toHaveBeenCalled();
      expect(updateGapsBatchMock).toHaveBeenCalledWith({
        gaps,
        backfillSchedule,
        savedObjectsRepository: mockSavedObjectsRepository,
        shouldRefetchAllBackfills: true,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
        logger: mockLogger,
        ruleId,
        eventLogClient: mockEventLogClient,
        alertingEventLogger: expect.any(AlertingEventLogger),
        initiator: backfillInitiator.USER,
      });
    });

    it('should log an error when update gaps is not successful', async () => {
      updateGapsBatchMock.mockResolvedValue(false);
      await updateGaps({
        ruleId,
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
        gaps,
        backfillSchedule,
        shouldRefetchAllBackfills: true,
        initiator: backfillInitiator.USER,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update gaps for rule test-rule-id from: 2024-01-01T00:00:00.000Z to: 2024-01-01T01:00:00.000Z: Some gaps failed to update'
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
