/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { errorAggregator } from './utils';
import { BulkResponseErrorAggregation } from './utils';

const sampleBulkErrorItem = (
  {
    status,
    reason,
  }: {
    status: number;
    reason: string;
  } = { status: 400, reason: 'Invalid call' }
): { create: estypes.BulkResponseItem } => {
  return {
    create: {
      _index: 'mock_index',
      _id: '123',
      _version: 1,
      status,
      _shards: {
        total: 1,
        successful: 0,
        failed: 1,
      },
      error: {
        type: 'Invalid',
        reason,
        shard: 'shard 123',
        index: 'mock_index',
      },
    },
  };
};

const sampleBulkItem = (): { create: estypes.BulkResponseItem } => {
  return {
    create: {
      _index: 'mock_index',
      _id: '123',
      _version: 1,
      status: 200,
      result: 'some result here',
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
      },
    },
  };
};

const sampleEmptyBulkResponse = (): estypes.BulkResponse => ({
  took: 0,
  errors: false,
  items: [],
});

const sampleBulkError = (): estypes.BulkResponse => ({
  took: 0,
  errors: true,
  items: [sampleBulkErrorItem()],
});

const sampleBulkResponse = (): estypes.BulkResponse => ({
  took: 0,
  errors: true,
  items: [sampleBulkItem()],
});

describe('utils', () => {
  describe('errorAggregator', () => {
    test('it should aggregate with an empty object when given an empty bulk response', () => {
      const empty = sampleEmptyBulkResponse();
      const aggregated = errorAggregator(empty, []);
      const expected: BulkResponseErrorAggregation = {};
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate with an empty create object', () => {
      const empty = sampleBulkResponse();
      empty.items = [{}];
      const aggregated = errorAggregator(empty, []);
      const expected: BulkResponseErrorAggregation = {};
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate with an empty object when given a valid bulk response with no errors', () => {
      const validResponse = sampleBulkResponse();
      const aggregated = errorAggregator(validResponse, []);
      const expected: BulkResponseErrorAggregation = {};
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate with a single error when given a single error item', () => {
      const singleError = sampleBulkError();
      const aggregated = errorAggregator(singleError, []);
      const expected: BulkResponseErrorAggregation = {
        'Invalid call': {
          count: 1,
          statusCode: 400,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate two errors with a correct count when given the same two error items', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem();
      const item2 = sampleBulkErrorItem();
      twoAggregatedErrors.items = [item1, item2];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Invalid call': {
          count: 2,
          statusCode: 400,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate three errors with a correct count when given the same two error items', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem();
      const item2 = sampleBulkErrorItem();
      const item3 = sampleBulkErrorItem();
      twoAggregatedErrors.items = [item1, item2, item3];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Invalid call': {
          count: 3,
          statusCode: 400,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate two distinct errors with the correct count of 1 for each error type', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item2 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      twoAggregatedErrors.items = [item1, item2];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Parse Error': {
          count: 1,
          statusCode: 400,
        },
        'Bad Network': {
          count: 1,
          statusCode: 500,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate two of the same errors with the correct count of 2 for each error type', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item2 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      twoAggregatedErrors.items = [item1, item2, item3, item4];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Parse Error': {
          count: 2,
          statusCode: 400,
        },
        'Bad Network': {
          count: 2,
          statusCode: 500,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate three of the same errors with the correct count of 2 for each error type', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item2 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item5 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item6 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      twoAggregatedErrors.items = [item1, item2, item3, item4, item5, item6];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Parse Error': {
          count: 2,
          statusCode: 400,
        },
        'Bad Network': {
          count: 2,
          statusCode: 500,
        },
        'Bad Gateway': {
          count: 2,
          statusCode: 502,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate a mix of errors with the correct aggregate count of each', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item2 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item5 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item6 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      twoAggregatedErrors.items = [item1, item2, item3, item4, item5, item6];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Parse Error': {
          count: 1,
          statusCode: 400,
        },
        'Bad Network': {
          count: 2,
          statusCode: 500,
        },
        'Bad Gateway': {
          count: 3,
          statusCode: 502,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it will ignore error single codes such as 409', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 409, reason: 'Conflict Error' });
      const item2 = sampleBulkErrorItem({ status: 409, reason: 'Conflict Error' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item5 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item6 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      twoAggregatedErrors.items = [item1, item2, item3, item4, item5, item6];
      const aggregated = errorAggregator(twoAggregatedErrors, [409]);
      const expected: BulkResponseErrorAggregation = {
        'Bad Network': {
          count: 1,
          statusCode: 500,
        },
        'Bad Gateway': {
          count: 3,
          statusCode: 502,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it will ignore two error codes such as 409 and 502', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 409, reason: 'Conflict Error' });
      const item2 = sampleBulkErrorItem({ status: 409, reason: 'Conflict Error' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item5 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item6 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      twoAggregatedErrors.items = [item1, item2, item3, item4, item5, item6];
      const aggregated = errorAggregator(twoAggregatedErrors, [409, 502]);
      const expected: BulkResponseErrorAggregation = {
        'Bad Network': {
          count: 1,
          statusCode: 500,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it will return an empty object given valid inputs and status codes to ignore', () => {
      const bulkResponse = sampleBulkResponse();
      const aggregated = errorAggregator(bulkResponse, [409, 502]);
      const expected: BulkResponseErrorAggregation = {};
      expect(aggregated).toEqual(expected);
    });
  });
});
