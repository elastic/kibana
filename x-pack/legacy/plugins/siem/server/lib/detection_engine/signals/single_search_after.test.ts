/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import {
  sampleRuleAlertParams,
  sampleDocSearchResultsNoSortId,
  mockLogger,
  sampleDocSearchResultsWithSortId,
} from './__mocks__/es_results';
import { singleSearchAfter } from './single_search_after';

export const mockService = {
  callCluster: jest.fn(),
  alertInstanceFactory: jest.fn(),
  savedObjectsClient: savedObjectsClientMock.create(),
};

describe('singleSearchAfter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('if singleSearchAfter works without a given sort id', async () => {
    let searchAfterSortId;
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockReturnValue(sampleDocSearchResultsNoSortId);
    await expect(
      singleSearchAfter({
        searchAfterSortId,
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        pageSize: 1,
        filter: undefined,
      })
    ).rejects.toThrow('Attempted to search after with empty sort id');
  });
  test('if singleSearchAfter works with a given sort id', async () => {
    const searchAfterSortId = '1234567891111';
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockReturnValue(sampleDocSearchResultsWithSortId);
    const searchAfterResult = await singleSearchAfter({
      searchAfterSortId,
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      pageSize: 1,
      filter: undefined,
    });
    expect(searchAfterResult).toEqual(sampleDocSearchResultsWithSortId);
  });
  test('if singleSearchAfter throws error', async () => {
    const searchAfterSortId = '1234567891111';
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockImplementation(async () => {
      throw Error('Fake Error');
    });
    await expect(
      singleSearchAfter({
        searchAfterSortId,
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        pageSize: 1,
        filter: undefined,
      })
    ).rejects.toThrow('Fake Error');
  });
});
