/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mgetGaps } from './mget_gaps';
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

describe('mgetGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should call findEventsByDocumentIds with correct parameters', async () => {
    const mockDocs = [{ _id: 'test-gap-id', _index: 'test-index' }];

    mockEventLogClient.findEventsByDocumentIds.mockResolvedValue({
      data: [createMockGapEvent()],
    });

    await mgetGaps({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        docs: mockDocs,
      },
    });

    expect(mockEventLogClient.findEventsByDocumentIds).toHaveBeenCalledWith(mockDocs);
  });

  it('should transform response data to Gap objects', async () => {
    const mockResponse = {
      data: [createMockGapEvent()],
    };

    mockEventLogClient.findEventsByDocumentIds.mockResolvedValue(mockResponse);

    const result = await mgetGaps({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        docs: [{ _id: 'test-gap-id', _index: 'test-index' }],
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
    mockEventLogClient.findEventsByDocumentIds.mockResolvedValue({
      data: [],
    });

    const result = await mgetGaps({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        docs: [{ _id: 'non-existent-gap', _index: 'test-index' }],
      },
    });

    expect(result).toEqual([]);
  });

  it('should handle multiple gap documents', async () => {
    const mockDocs = [
      { _id: 'test-gap-id-1', _index: 'test-index' },
      { _id: 'test-gap-id-2', _index: 'test-index' },
    ];

    mockEventLogClient.findEventsByDocumentIds.mockResolvedValue({
      data: [createMockGapEvent(), { ...createMockGapEvent(), _id: 'test-gap-id-2' }],
    });

    const result = await mgetGaps({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      params: {
        docs: mockDocs,
      },
    });

    expect(mockEventLogClient.findEventsByDocumentIds).toHaveBeenCalledWith(mockDocs);
    expect(result.length).toBe(2);
  });

  it('should handle errors and log them', async () => {
    const error = new Error('Test error');
    const mockDocs = [{ _id: 'test-gap-id', _index: 'test-index' }];

    mockEventLogClient.findEventsByDocumentIds.mockRejectedValue(error);

    await expect(
      mgetGaps({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        params: {
          docs: mockDocs,
        },
      })
    ).rejects.toThrow(error);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to mget gaps by id test-gap-id: Test error'
    );
  });
});
