/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { updateGapsInEventLog } from './update_gaps_in_event_log';
import { loggerMock } from '@kbn/logging-mocks';
import { backfillClientMock } from '../../../backfill_client/backfill_client.mock';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { updateGapsBatch } from './update_gaps_batch';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { Gap } from '../gap';
import { adHocRunStatus } from '../../../../common/constants';
import { alertingEventLoggerMock } from '../../alerting_event_logger/alerting_event_logger.mock';
import { findOverlappingIntervals, toScheduledItem, prepareGapsForUpdate } from './utils';
import { applyScheduledBackfillsToGap } from './apply_scheduled_backfills_to_gap';
import { backfillInitiator } from '../../../../common/constants';

jest.mock('./update_gaps_in_event_log', () => ({
  updateGapsInEventLog: jest.fn().mockResolvedValue(true),
}));
jest.mock('./utils');
jest.mock('./apply_scheduled_backfills_to_gap', () => ({
  applyScheduledBackfillsToGap: jest.fn().mockResolvedValue(undefined),
}));

const updateGapsInEventLogMock = updateGapsInEventLog as jest.Mock;
const findOverlappingIntervalsMock = findOverlappingIntervals as jest.Mock;
const toScheduledItemMock = toScheduledItem as jest.Mock;
const applyScheduledBackfillsToGapMock = applyScheduledBackfillsToGap as jest.Mock;

const savedObjectsRepository = savedObjectsRepositoryMock.create();
const mockLogger = loggerMock.create();
const backfillClient = backfillClientMock.create();
const actionsClient = actionsClientMock.create();
const eventLogClient = eventLogClientMock.create();
const alertingEventLogger = alertingEventLoggerMock.create();
const ruleId = 'some-rule-id';
const getGap = (id: string) =>
  new Gap({
    ruleId,
    range: {
      gte: '2024-01-01T00:00:00.000Z',
      lte: '2024-01-01T01:00:00.000Z',
    },
    internalFields: {
      _id: `test-${id}`,
      _index: 'test-index',
      _seq_no: 1,
      _primary_term: 1,
    },
  });
const gaps = [getGap('1'), getGap('2')];
const backfillSchedule = [
  {
    runAt: '2024-01-01T00:30:00.000Z',
    interval: '30m',
    status: adHocRunStatus.COMPLETE,
  },
  {
    runAt: '2024-01-01T00:40:00.000Z',
    interval: '10m',
    status: adHocRunStatus.COMPLETE,
  },
];

describe('updateGapsBatch', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    await updateGapsBatch({
      gaps,
      eventLogClient,
      backfillSchedule,
      savedObjectsRepository,
      actionsClient,
      alertingEventLogger,
      logger: mockLogger,
      ruleId,
      backfillClient,
      shouldRefetchAllBackfills: true,
      initiator: backfillInitiator.USER,
    });
  });

  it('should call updateGapsInEventLog with the right parameters', () => {
    expect(updateGapsInEventLogMock).toHaveBeenCalledWith({
      gaps,
      prepareGaps: expect.any(Function),
      eventLogClient,
      alertingEventLogger,
      logger: mockLogger,
    });
  });

  describe('prepareGaps fn', () => {
    let prepareGapsFn: Function;
    let result: Array<{
      gap: ReturnType<typeof Gap.prototype.toObject>;
      internalFields: typeof Gap.prototype.internalFields;
    }>;

    beforeEach(async () => {
      findOverlappingIntervalsMock.mockImplementation((gapsToProcess: Gap[], scheduledItems) =>
        gapsToProcess.map((gap) => ({
          gap,
          scheduled: scheduledItems,
        }))
      );

      toScheduledItemMock.mockImplementation(identity);
      (prepareGapsForUpdate as unknown as jest.Mock).mockImplementation((gapsToUpdate: Gap[]) =>
        gapsToUpdate.map((gap) => ({ gap: gap.toObject(), internalFields: gap.internalFields }))
      );
      prepareGapsFn = updateGapsInEventLogMock.mock.calls[0][0].prepareGaps;
      result = await prepareGapsFn(gaps);
    });

    it('should apply the backfill schedule to each gap', () => {
      gaps.forEach((gap, idx) => {
        const callOrder = idx + 1;
        expect(applyScheduledBackfillsToGapMock).toHaveBeenNthCalledWith(callOrder, {
          gap,
          scheduledItems: backfillSchedule,
          savedObjectsRepository,
          shouldRefetchAllBackfills: true,
          logger: mockLogger,
          backfillClient,
          actionsClient,
          ruleId,
          initiator: backfillInitiator.USER,
        });
      });
    });

    it('should return gaps ready to be written to the event log', () => {
      expect(result).toEqual(
        gaps.map((gap) => ({
          gap: gap.toObject(),
          internalFields: gap.internalFields,
        }))
      );
    });

    it('sets updated_at on each gap', async () => {
      const spies = gaps.map((g) => jest.spyOn(g, 'setUpdatedAt'));
      await prepareGapsFn(gaps);
      spies.forEach((s) => expect(s).toHaveBeenCalled());
    });

    it('updates the updated_at timestamp value', async () => {
      const initial = '2025-01-01T00:00:00.000Z';
      const customGap = new Gap({
        ruleId,
        range: {
          gte: '2025-01-01T00:00:00.000Z',
          lte: '2025-01-01T01:00:00.000Z',
        },
        internalFields: {
          _id: 'custom-1',
          _index: 'test-index',
          _seq_no: 1,
          _primary_term: 1,
        },
        updatedAt: initial,
      });

      await prepareGapsFn([customGap]);
      expect(customGap.updatedAt).not.toEqual(initial);
      expect(typeof customGap.updatedAt).toBe('string');
    });
  });
});
