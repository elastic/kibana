/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  sampleRuleAlertParams,
  sampleEmptyDocSearchResults,
  sampleRuleGuid,
  mockLogger,
  repeatedSearchResultsWithSortId,
  sampleBulkCreateDuplicateResult,
  sampleDocSearchResultsNoSortId,
  sampleDocSearchResultsNoSortIdNoHits,
} from './__mocks__/es_results';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import uuid from 'uuid';

export const mockService = {
  callCluster: jest.fn(),
  alertInstanceFactory: jest.fn(),
  savedObjectsClient: savedObjectsClientMock.create(),
};

describe('searchAfterAndBulkCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('if successful with empty search results', async () => {
    const sampleParams = sampleRuleAlertParams();
    const result = await searchAfterAndBulkCreate({
      someResult: sampleEmptyDocSearchResults,
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    expect(mockService.callCluster).toHaveBeenCalledTimes(0);
    expect(result).toEqual(true);
  });
  test('if successful iteration of while loop with maxDocs', async () => {
    const sampleParams = sampleRuleAlertParams(30);
    const someGuids = Array.from({ length: 13 }).map(x => uuid.v4());
    mockService.callCluster
      .mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      })
      .mockReturnValueOnce(repeatedSearchResultsWithSortId(3, 1, someGuids.slice(0, 3)))
      .mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      })
      .mockReturnValueOnce(repeatedSearchResultsWithSortId(3, 1, someGuids.slice(3, 6)))
      .mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      });
    const result = await searchAfterAndBulkCreate({
      someResult: repeatedSearchResultsWithSortId(3, 1, someGuids.slice(6, 9)),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    expect(mockService.callCluster).toHaveBeenCalledTimes(5);
    expect(result).toEqual(true);
  });
  test('if unsuccessful first bulk create', async () => {
    const someGuids = Array.from({ length: 4 }).map(x => uuid.v4());
    const sampleParams = sampleRuleAlertParams(10);
    mockService.callCluster.mockReturnValue(sampleBulkCreateDuplicateResult);
    const result = await searchAfterAndBulkCreate({
      someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    expect(mockLogger.error).toHaveBeenCalled();
    expect(result).toEqual(false);
  });
  test('if unsuccessful iteration of searchAfterAndBulkCreate due to empty sort ids', async () => {
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockReturnValueOnce({
      took: 100,
      errors: false,
      items: [
        {
          fakeItemValue: 'fakeItemKey',
        },
      ],
    });
    const result = await searchAfterAndBulkCreate({
      someResult: sampleDocSearchResultsNoSortId(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    expect(mockLogger.error).toHaveBeenCalled();
    expect(result).toEqual(false);
  });
  test('if unsuccessful iteration of searchAfterAndBulkCreate due to empty sort ids and 0 total hits', async () => {
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockReturnValueOnce({
      took: 100,
      errors: false,
      items: [
        {
          fakeItemValue: 'fakeItemKey',
        },
      ],
    });
    const result = await searchAfterAndBulkCreate({
      someResult: sampleDocSearchResultsNoSortIdNoHits(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    expect(result).toEqual(true);
  });
  test('if successful iteration of while loop with maxDocs and search after returns results with no sort ids', async () => {
    const sampleParams = sampleRuleAlertParams(10);
    const someGuids = Array.from({ length: 4 }).map(x => uuid.v4());
    mockService.callCluster
      .mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      })
      .mockReturnValueOnce(sampleDocSearchResultsNoSortId());
    const result = await searchAfterAndBulkCreate({
      someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    expect(result).toEqual(true);
  });
  test('if successful iteration of while loop with maxDocs and search after returns empty results with no sort ids', async () => {
    const sampleParams = sampleRuleAlertParams(10);
    const someGuids = Array.from({ length: 4 }).map(x => uuid.v4());
    mockService.callCluster
      .mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      })
      .mockReturnValueOnce(sampleEmptyDocSearchResults);
    const result = await searchAfterAndBulkCreate({
      someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    expect(result).toEqual(true);
  });
  test('if returns false when singleSearchAfter throws an exception', async () => {
    const sampleParams = sampleRuleAlertParams(10);
    const someGuids = Array.from({ length: 4 }).map(x => uuid.v4());
    mockService.callCluster
      .mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      })
      .mockImplementation(() => {
        throw Error('Fake Error');
      });
    const result = await searchAfterAndBulkCreate({
      someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      pageSize: 1,
      filter: undefined,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    expect(result).toEqual(false);
  });
});
