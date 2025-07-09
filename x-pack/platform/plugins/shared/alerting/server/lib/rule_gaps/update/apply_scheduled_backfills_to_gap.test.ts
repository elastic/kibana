/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { adHocRunStatus } from '../../../../common/constants';
import { backfillClientMock } from '../../../backfill_client/backfill_client.mock';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { Gap } from '../gap';
import { applyScheduledBackfillsToGap } from './apply_scheduled_backfills_to_gap';
import { calculateGapStateFromAllBackfills } from './calculate_gaps_state';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import type { ScheduledItem } from './utils';

jest.mock('./calculate_gaps_state', () => ({
  calculateGapStateFromAllBackfills: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./update_gap_from_schedule');

const calculateGapStateFromAllBackfillsMock = calculateGapStateFromAllBackfills as jest.Mock;
const updateGapFromScheduleMock = updateGapFromSchedule as jest.Mock;

const savedObjectsRepository = savedObjectsRepositoryMock.create();
const mockLogger = loggerMock.create();
const backfillClient = backfillClientMock.create();
const actionsClient = actionsClientMock.create();
const ruleId = 'some-rule-id';

const scheduledItems = [
  {
    status: adHocRunStatus.COMPLETE,
  },
  {
    status: adHocRunStatus.COMPLETE,
  },
] as ScheduledItem[];

const gap = new Gap({
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

describe('applyScheduledBackfillsToGap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('when the gap state must be calculated based on all backfills', () => {
    test('when the scheduled items array is empty', async () => {
      await applyScheduledBackfillsToGap({
        gap,
        scheduledItems: [],
        savedObjectsRepository,
        logger: mockLogger,
        backfillClient,
        actionsClient,
        ruleId,
      });

      expect(calculateGapStateFromAllBackfillsMock).toHaveBeenCalledWith({
        gap,
        savedObjectsRepository,
        ruleId,
        backfillClient,
        actionsClient,
        logger: mockLogger,
      });
      expect(updateGapFromScheduleMock).not.toHaveBeenCalled();
    });

    test('when there is a scheduled item with an errored task', async () => {
      const scheduledItemsWithFailedTask = [
        ...scheduledItems,
        {
          status: adHocRunStatus.ERROR,
        } as ScheduledItem,
      ];
      await applyScheduledBackfillsToGap({
        gap,
        scheduledItems: scheduledItemsWithFailedTask,
        savedObjectsRepository,
        logger: mockLogger,
        backfillClient,
        actionsClient,
        ruleId,
      });

      expect(calculateGapStateFromAllBackfillsMock).toHaveBeenCalledWith({
        gap,
        savedObjectsRepository,
        ruleId,
        backfillClient,
        actionsClient,
        logger: mockLogger,
      });
      expect(updateGapFromScheduleMock).not.toHaveBeenCalled();
    });

    test('when there is a scheduled item with a task that timed out', async () => {
      const scheduledItemsWithFailedTask = [
        ...scheduledItems,
        {
          status: adHocRunStatus.TIMEOUT,
        } as ScheduledItem,
      ];
      await applyScheduledBackfillsToGap({
        gap,
        scheduledItems: scheduledItemsWithFailedTask,
        savedObjectsRepository,
        logger: mockLogger,
        backfillClient,
        actionsClient,
        ruleId,
      });

      expect(calculateGapStateFromAllBackfillsMock).toHaveBeenCalledWith({
        gap,
        savedObjectsRepository,
        ruleId,
        backfillClient,
        actionsClient,
        logger: mockLogger,
      });
      expect(updateGapFromScheduleMock).not.toHaveBeenCalled();
    });

    test('when shouldRefetchAllBackfills is true', async () => {
      await applyScheduledBackfillsToGap({
        gap,
        scheduledItems,
        savedObjectsRepository,
        logger: mockLogger,
        backfillClient,
        actionsClient,
        ruleId,
        shouldRefetchAllBackfills: true,
      });

      expect(calculateGapStateFromAllBackfillsMock).toHaveBeenCalledWith({
        gap,
        savedObjectsRepository,
        ruleId,
        backfillClient,
        actionsClient,
        logger: mockLogger,
      });
      expect(updateGapFromScheduleMock).not.toHaveBeenCalled();
    });
  });

  describe('when the gap is updated based on the scheduled items received in the parameters', () => {
    it('should update the gap', async () => {
      await applyScheduledBackfillsToGap({
        gap,
        scheduledItems,
        savedObjectsRepository,
        logger: mockLogger,
        backfillClient,
        actionsClient,
        ruleId,
      });

      expect(calculateGapStateFromAllBackfillsMock).not.toHaveBeenCalled();
      expect(updateGapFromScheduleMock).toHaveBeenCalledWith({ gap, scheduledItems });
    });
  });
});
