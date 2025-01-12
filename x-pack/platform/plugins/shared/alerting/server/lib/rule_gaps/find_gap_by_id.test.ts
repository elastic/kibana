/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findGapById } from './find_gap_by_id';
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

describe('findGapById', () => {
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

    await findGapById({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        ruleId: 'test-rule',
        gapId: 'test-gap-id',
      },
    });

    expect(mockEventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledWith(
      'alert',
      ['test-rule'],
      expect.objectContaining({
        filter: '_id: test-gap-id',
      })
    );
  });

  it('should transform response data to Gap object', async () => {
    const mockResponse = {
      total: 1,
      data: [createMockGapEvent()],
      page: 1,
      per_page: 1,
    };

    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue(mockResponse);

    const result = await findGapById({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: { ruleId: 'test-rule', gapId: 'test-gap-id' },
    });

    expect(result).toBeInstanceOf(Gap);
    expect(result?.range).toEqual({
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-02'),
    });
    expect(result?.filledIntervals).toEqual([]);
    expect(result?.inProgressIntervals).toEqual([]);
  });

  it('should return null when gap is not found', async () => {
    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue({
      total: 0,
      data: [],
      page: 1,
      per_page: 1,
    });

    const result = await findGapById({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: { ruleId: 'test-rule', gapId: 'non-existent-gap' },
    });

    expect(result).toBeNull();
  });

  it('should handle errors and log them', async () => {
    const error = new Error('Test error');
    mockEventLogClient.findEventsBySavedObjectIds.mockRejectedValue(error);

    await expect(
      findGapById({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        params: { ruleId: 'test-rule', gapId: 'test-gap-id' },
      })
    ).rejects.toThrow(error);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to find gap by id test-gap-id for rule test-rule')
    );
  });
});
