/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateGaps } from './update_gaps';
import { findAllGaps } from '../find_gaps';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import { calculateGapStateFromAllBackfills } from './calculate_gaps_state';
import { backfillClientMock } from '../../../backfill_client/backfill_client.mock';

import { loggerMock } from '@kbn/logging-mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { Gap } from '../gap';
import { adHocRunStatus } from '../../../../common/constants';
import { errors as EsErrors } from '@elastic/elasticsearch';

jest.mock('../find_gaps');
jest.mock('./update_gap_from_schedule');
jest.mock('./calculate_gaps_state');

describe('updateGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogger = eventLoggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();
  const mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const mockBackfillClient = backfillClientMock.create();

  const createTestGap = () =>
    new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
      internalFields: {
        _id: 'test-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    });

  beforeEach(() => {
    jest.resetAllMocks();
    (findAllGaps as jest.Mock).mockResolvedValue([]);
  });

  describe('updateGaps', () => {
    it('should orchestrate the gap update process', async () => {
      const testGap = createTestGap();
      (findAllGaps as jest.Mock).mockResolvedValue([testGap]);

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
      });

      expect(findAllGaps).toHaveBeenCalledWith({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        params: {
          ruleId: 'test-rule-id',
          start: expect.any(Date),
          end: expect.any(Date),
          statuses: ['partially_filled', 'unfilled'],
        },
      });
      expect(mockEventLogger.updateEvent).toHaveBeenCalled();
    });

    it('should handle multiple gaps in the time range', async () => {
      const gaps = [
        createTestGap(),
        new Gap({
          range: {
            gte: '2024-01-01T01:00:00.000Z',
            lte: '2024-01-01T02:00:00.000Z',
          },
          internalFields: {
            _id: 'test-id-2',
            _index: 'test-index',
            _seq_no: 2,
            _primary_term: 1,
          },
        }),
      ];
      (findAllGaps as jest.Mock).mockResolvedValue(gaps);

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T02:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
      });

      expect(mockEventLogger.updateEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle findAllGaps errors', async () => {
      (findAllGaps as jest.Mock).mockRejectedValue(new Error('Find gaps failed'));

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update gaps for rule test-rule-id')
      );
    });

    it('should retry on conflict errors', async () => {
      const testGap = createTestGap();
      (findAllGaps as jest.Mock).mockResolvedValue([testGap]);

      const conflictError = new EsErrors.ResponseError({
        statusCode: 409,
        body: { error: { type: 'version_conflict_engine_exception' } },
        headers: {},
        meta: {} as any,
        warnings: [],
      });

      mockEventLogger.updateEvent
        .mockRejectedValueOnce(conflictError)
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValue();

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
      });

      expect(mockEventLogger.updateEvent).toHaveBeenCalledTimes(3);
    });
  });

  describe('backfill handling', () => {
    beforeEach(() => {
      (updateGapFromSchedule as jest.Mock).mockImplementation((params) => params.gap);
      (calculateGapStateFromAllBackfills as jest.Mock).mockImplementation((params) => params.gap);
    });

    it('should handle direct schedule updates', async () => {
      const testGap = createTestGap();
      (findAllGaps as jest.Mock).mockResolvedValue([testGap]);

      const backfillSchedule = [
        {
          runAt: '2024-01-01T00:30:00.000Z',
          interval: '30m',
          status: adHocRunStatus.COMPLETE,
        },
      ];

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillSchedule,
        backfillClient: mockBackfillClient,
      });

      expect(updateGapFromSchedule).toHaveBeenCalledWith({
        gap: testGap,
        backfillSchedule,
      });
      expect(calculateGapStateFromAllBackfills).not.toHaveBeenCalled();
    });

    it('should trigger refetch when shouldRefetchAllBackfills is true', async () => {
      const testGap = createTestGap();
      (findAllGaps as jest.Mock).mockResolvedValue([testGap]);

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        shouldRefetchAllBackfills: true,
        backfillClient: mockBackfillClient,
      });

      expect(updateGapFromSchedule).not.toHaveBeenCalled();
      expect(calculateGapStateFromAllBackfills).toHaveBeenCalled();
    });
  });
});
