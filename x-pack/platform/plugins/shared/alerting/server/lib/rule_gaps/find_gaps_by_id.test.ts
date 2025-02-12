/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findGapsById } from './find_gaps_by_id';
import { loggerMock } from '@kbn/logging-mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { Gap } from './gap';

const createMockGapEvent = () => ({
  _id: 'test-gap-id',
  _index: 'test-index',
  _seq_no: 1,
  _primary_term: 1,
  '@timestamp': '2024-01-01T00:00:00.000Z',
  event: {
    start: '2024-01-01',
    end: '2024-01-02',
    action: 'gap',
  },
  kibana: {
    alert: {
      rule: {
        gap: {
          range: { gte: '2024-01-01', lte: '2024-01-02' },
          filled_intervals: [],
          in_progress_intervals: [],
        },
      },
    },
  },
});

describe('findGapsById', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should call findEventsBySavedObjectIds with correct parameters', async () => {
    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue({
      total: 1,
      data: [createMockGapEvent()],
      page: 1,
      per_page: 1,
    });

    await findGapsById({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        ruleId: 'test-rule',
        gapIds: ['test-gap-id'],
        page: 1,
        perPage: 10,
      },
    });

    expect(mockEventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledWith(
      'alert',
      ['test-rule'],
      expect.objectContaining({
        filter: '_id: test-gap-id',
        page: 1,
        per_page: 10,
      })
    );
  });

  it('should transform response data to Gap objects', async () => {
    const mockResponse = {
      total: 1,
      data: [createMockGapEvent()],
      page: 1,
      per_page: 1,
    };

    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue(mockResponse);

    const result = await findGapsById({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        ruleId: 'test-rule',
        gapIds: ['test-gap-id'],
        page: 1,
        perPage: 10,
      },
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toBeInstanceOf(Gap);
    expect(result[0].range).toEqual({
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-02'),
    });
    expect(result[0].filledIntervals).toEqual([]);
    expect(result[0].inProgressIntervals).toEqual([]);
  });

  it('should return empty array when gaps are not found', async () => {
    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue({
      total: 0,
      data: [],
      page: 1,
      per_page: 1,
    });

    const result = await findGapsById({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        ruleId: 'test-rule',
        gapIds: ['non-existent-gap'],
        page: 1,
        perPage: 10,
      },
    });

    expect(result).toEqual([]);
  });

  it('should handle multiple gap ids', async () => {
    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue({
      total: 2,
      data: [createMockGapEvent(), { ...createMockGapEvent(), _id: 'test-gap-id-2' }],
      page: 1,
      per_page: 10,
    });

    await findGapsById({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        ruleId: 'test-rule',
        gapIds: ['test-gap-id', 'test-gap-id-2'],
        page: 1,
        perPage: 10,
      },
    });

    expect(mockEventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledWith(
      'alert',
      ['test-rule'],
      expect.objectContaining({
        filter: '_id: test-gap-id OR _id: test-gap-id-2',
      })
    );
  });

  it('should handle errors and log them', async () => {
    const error = new Error('Test error');
    mockEventLogClient.findEventsBySavedObjectIds.mockRejectedValue(error);

    await expect(
      findGapsById({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        params: {
          ruleId: 'test-rule',
          gapIds: ['test-gap-id'],
          page: 1,
          perPage: 10,
        },
      })
    ).rejects.toThrow(error);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to find gaps by id test-gap-id for rule test-rule')
    );
  });
});
