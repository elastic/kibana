/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findGaps, findAllGaps } from './find_gaps';
import { gapStatus } from '../../../common/constants/gap_status';
import { loggerMock } from '@kbn/logging-mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { Gap } from './gap';

const createMockGapEvent = () => ({
  _id: 'test-id',
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

describe('findGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should call findEventsBySavedObjectIds with correct parameters', async () => {
    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue({
      total: 0,
      data: [],
      page: 1,
      per_page: 10,
    });

    await findGaps({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        ruleId: 'test-rule',
        start: '2024-01-01',
        end: '2024-01-02',
        page: 1,
        perPage: 10,
        statuses: [gapStatus.UNFILLED],
      },
    });

    expect(mockEventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledWith(
      'alert',
      ['test-rule'],
      expect.objectContaining({
        filter: expect.stringContaining('event.action: gap'),
        sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
        page: 1,
        per_page: 10,
      })
    );
  });

  it('should handle custom sort field', async () => {
    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue({
      total: 0,
      data: [],
      page: 1,
      per_page: 10,
    });

    await findGaps({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        ruleId: 'test-rule',
        page: 1,
        perPage: 10,
        sortField: 'total_gap_duration_ms',
        sortOrder: 'asc',
      },
    });

    expect(mockEventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledWith(
      'alert',
      ['test-rule'],
      expect.objectContaining({
        sort: [{ sort_field: 'kibana.alert.rule.gap.total_gap_duration_ms', sort_order: 'asc' }],
      })
    );
  });

  it('should transform response data to Gap objects', async () => {
    const mockResponse = {
      total: 1,
      data: [createMockGapEvent()],
      page: 1,
      per_page: 10,
    };

    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue(mockResponse);

    const result = await findGaps({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: { ruleId: 'test-rule', page: 1, perPage: 10 },
    });

    expect(result.data[0]).toBeInstanceOf(Gap);
    expect(result.data[0].range).toEqual({
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-02'),
    });
    expect(result.data[0].filledIntervals).toEqual([]);
    expect(result.data[0].inProgressIntervals).toEqual([]);
  });

  it('should handle errors and log them', async () => {
    const error = new Error('Test error');
    mockEventLogClient.findEventsBySavedObjectIds.mockRejectedValue(error);

    await expect(
      findGaps({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        params: { ruleId: 'test-rule', page: 1, perPage: 10 },
      })
    ).rejects.toThrow(error);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to find gaps for rule test-rule')
    );
  });
});

describe('findAllGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch all pages of gaps', async () => {
    mockEventLogClient.findEventsBySavedObjectIds
      .mockResolvedValueOnce({
        total: 15000,
        data: Array(10000).fill(createMockGapEvent()),
        page: 1,
        per_page: 10000,
      })
      .mockResolvedValueOnce({
        total: 15000,
        data: Array(5000).fill(createMockGapEvent()),
        page: 2,
        per_page: 10000,
      });

    const result = await findAllGaps({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        ruleId: 'test-rule',
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      },
    });

    expect(result).toHaveLength(15000);
    expect(mockEventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(2);
  });

  it('should stop fetching when no more data', async () => {
    mockEventLogClient.findEventsBySavedObjectIds.mockResolvedValue({
      total: 50,
      data: Array(50).fill(createMockGapEvent()),
      page: 1,
      per_page: 10000,
    });

    const result = await findAllGaps({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        ruleId: 'test-rule',
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      },
    });

    expect(result).toHaveLength(50);
    expect(mockEventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
  });

  it('should handle errors during pagination', async () => {
    mockEventLogClient.findEventsBySavedObjectIds
      .mockResolvedValueOnce({
        total: 15000,
        data: Array(10000).fill(createMockGapEvent()),
        page: 1,
        per_page: 10000,
      })
      .mockRejectedValueOnce(new Error('Pagination failed'));

    await expect(
      findAllGaps({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        params: {
          ruleId: 'test-rule',
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
      })
    ).rejects.toThrow('Pagination failed');

    expect(mockLogger.error).toHaveBeenCalled();
  });
});
