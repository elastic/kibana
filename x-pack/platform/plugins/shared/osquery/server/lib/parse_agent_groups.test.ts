/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateResults } from './parse_agent_groups';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { OsqueryAppContext } from './osquery_app_context_services';

const mockOpenPointInTime = jest.fn().mockResolvedValue({ id: 'mockedPitId' });
const mockClosePointInTime = jest.fn();

const mockElasticsearchClient = {
  openPointInTime: mockOpenPointInTime,
  closePointInTime: mockClosePointInTime,
} as unknown as ElasticsearchClientMock;

const mockContext = {} as unknown as OsqueryAppContext;

describe('aggregateResults', () => {
  it('should handle one page of results', async () => {
    const generatorMock = jest.fn().mockResolvedValue({
      results: ['result1', 'result2'],
      total: 2,
    });

    const result = await aggregateResults(generatorMock, mockElasticsearchClient, mockContext);

    expect(generatorMock).toHaveBeenCalledWith(1, expect.any(Number)); // 1st page, PER_PAGE
    expect(mockOpenPointInTime).not.toHaveBeenCalled();
    expect(mockClosePointInTime).not.toHaveBeenCalled();

    expect(result).toEqual(['result1', 'result2']);
  });

  it('should handle multiple pages of results', async () => {
    const generateResults = (run = 1, length = 9000) =>
      Array.from({ length }, (_, index) => `result_${index + 1 + (run - 1) * length}`);

    const generatorMock = jest
      .fn()
      .mockResolvedValueOnce({
        results: generateResults(),
        total: 18001,
      })
      .mockResolvedValueOnce({
        results: generateResults(),
        total: 18001,
        searchAfter: ['firstSort'],
      })
      .mockResolvedValueOnce({
        results: generateResults(2),
        total: 18001,
        searchAfter: ['secondSort'],
      })
      .mockResolvedValueOnce({
        results: ['result_18001'],
        total: 18001,
        searchAfter: ['thirdSort'],
      });

    const result = await aggregateResults(generatorMock, mockElasticsearchClient, mockContext);
    expect(generatorMock).toHaveBeenCalledWith(1, expect.any(Number));
    expect(generatorMock).toHaveBeenCalledWith(1, expect.any(Number), undefined, 'mockedPitId');
    expect(generatorMock).toHaveBeenCalledWith(2, expect.any(Number), ['firstSort'], 'mockedPitId');
    expect(generatorMock).toHaveBeenCalledWith(
      3,
      expect.any(Number),
      ['secondSort'],
      'mockedPitId'
    );
    expect(mockOpenPointInTime).toHaveBeenCalledTimes(1);
    expect(mockClosePointInTime).toHaveBeenCalledTimes(1);
    expect(mockClosePointInTime).toHaveBeenCalledWith({ id: 'mockedPitId' });
    expect(result.length).toEqual(18001);
  });
});
