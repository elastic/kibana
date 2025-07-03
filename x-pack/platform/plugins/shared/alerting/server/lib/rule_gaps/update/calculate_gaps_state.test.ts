/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { backfillClientMock } from '../../../backfill_client/backfill_client.mock';
import { calculateGapStateFromAllBackfills } from './calculate_gaps_state';
import { Gap } from '../gap';
import { adHocRunStatus } from '../../../../common/constants';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { toScheduledItem } from './utils';

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    toScheduledItem: jest.fn().mockImplementation((item) => {
      if (item.shouldError) {
        throw new Error('error in toScheduledItem');
      }
      return actual.toScheduledItem(item);
    }),
  };
});

const toScheduledItemMock = toScheduledItem as jest.Mock;

describe('calculateGapStateFromAllBackfills', () => {
  const mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const mockBackfillClient = backfillClientMock.create();
  const actionsClient = actionsClientMock.create();
  const mockedLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockBackfillClient.findOverlappingBackfills.mockResolvedValue([]);
  });

  it('should calculate gap state', async () => {
    const testGap = new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
    });

    await calculateGapStateFromAllBackfills({
      gap: testGap,
      savedObjectsRepository: mockSavedObjectsRepository,
      ruleId: 'test-rule-id',
      backfillClient: mockBackfillClient,
      actionsClient,
      logger: mockedLogger,
    });

    expect(mockBackfillClient.findOverlappingBackfills).toHaveBeenCalledWith({
      ruleId: 'test-rule-id',
      start: testGap.range.gte,
      end: testGap.range.lte,
      savedObjectsRepository: mockSavedObjectsRepository,
      actionsClient,
    });
  });

  it('should reset in-progress intervals before processing backfills', async () => {
    const testGap = new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
      inProgressIntervals: [
        {
          gte: '2024-01-01T00:00:00.000Z',
          lte: '2024-01-01T00:30:00.000Z',
        },
      ],
    });

    const spy = jest.spyOn(testGap, 'resetInProgressIntervals');

    await calculateGapStateFromAllBackfills({
      gap: testGap,
      savedObjectsRepository: mockSavedObjectsRepository,
      ruleId: 'test-rule-id',
      backfillClient: mockBackfillClient,
      actionsClient,
      logger: mockedLogger,
    });

    expect(spy).toHaveBeenCalled();
    expect(testGap.inProgressIntervals).toHaveLength(0);
  });

  it('should update gap with backfill schedules from overlapping backfills', async () => {
    const testGap = new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
    });

    mockBackfillClient.findOverlappingBackfills.mockResolvedValueOnce([
      {
        schedule: [
          {
            runAt: '2024-01-01T00:15:00.000Z',
            interval: '15m',
            status: adHocRunStatus.RUNNING,
          },
          {
            runAt: '2024-01-01T00:20:00.000Z',
            interval: '15m',
            status: adHocRunStatus.PENDING,
          },
        ],
      },
    ]);

    const updatedGap = await calculateGapStateFromAllBackfills({
      gap: testGap,
      savedObjectsRepository: mockSavedObjectsRepository,
      ruleId: 'test-rule-id',
      backfillClient: mockBackfillClient,
      actionsClient,
      logger: mockedLogger,
    });

    expect(updatedGap.inProgressIntervals).toHaveLength(1);
    expect(updatedGap.inProgressIntervals[0]).toEqual({
      gte: new Date('2024-01-01T00:00:00.000Z'),
      lte: new Date('2024-01-01T00:20:00.000Z'),
    });
  });

  it('should filter out backfills with an error', async () => {
    const testGap = new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
    });

    mockBackfillClient.findOverlappingBackfills.mockResolvedValueOnce([
      { error: 'Some error' },
      {
        schedule: [
          {
            runAt: '2024-01-01T00:15:00.000Z',
            interval: '15m',
            status: adHocRunStatus.RUNNING,
          },
        ],
      },
    ]);

    const updatedGap = await calculateGapStateFromAllBackfills({
      gap: testGap,
      savedObjectsRepository: mockSavedObjectsRepository,
      ruleId: 'test-rule-id',
      backfillClient: mockBackfillClient,
      actionsClient,
      logger: mockedLogger,
    });

    expect(updatedGap.inProgressIntervals).toHaveLength(1);
    expect(updatedGap.inProgressIntervals[0]).toEqual({
      gte: new Date('2024-01-01T00:00:00.000Z'),
      lte: new Date('2024-01-01T00:15:00.000Z'),
    });
  });

  it('should log an error and recover when converting to scheduled item throws an error', async () => {
    const testGap = new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
    });

    mockBackfillClient.findOverlappingBackfills.mockResolvedValueOnce([
      { error: 'Some error' },
      {
        schedule: [
          {
            runAt: '2024-01-01T00:15:00.000Z',
            interval: '15m',
            status: adHocRunStatus.RUNNING,
          },
          {
            runAt: '2024-01-01T00:15:00.000Z',
            interval: '15m',
            status: adHocRunStatus.RUNNING,
            shouldError: true,
          },
        ],
      },
    ]);

    const actualToScheduledItem = jest.requireActual('./utils').toScheduledItem;
    toScheduledItemMock.mockImplementationOnce((item) => {
      if (item.shouldError) {
        throw new Error('error in toScheduledItem');
      }

      return actualToScheduledItem(item);
    });

    const updatedGap = await calculateGapStateFromAllBackfills({
      gap: testGap,
      savedObjectsRepository: mockSavedObjectsRepository,
      ruleId: 'test-rule-id',
      backfillClient: mockBackfillClient,
      actionsClient,
      logger: mockedLogger,
    });

    expect(updatedGap.inProgressIntervals).toHaveLength(1);
    expect(updatedGap.inProgressIntervals[0]).toEqual({
      gte: new Date('2024-01-01T00:00:00.000Z'),
      lte: new Date('2024-01-01T00:15:00.000Z'),
    });
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Error processing a scheduled item while updating gaps: error in toScheduledItem'
    );
  });
});
