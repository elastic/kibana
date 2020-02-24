/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsClientMock } from '../../../../../../../plugins/alerting/server/mocks';
import {
  getResult,
  getFindResultWithSingleHit,
  getFindResultWithMultiHits,
} from '../routes/__mocks__/request_responses';
import {
  getExistingPrepackagedRules,
  getNonPackagedRules,
  getRules,
  getRulesCount,
  getNonPackagedRulesCount,
} from './get_existing_prepackaged_rules';

describe('get_existing_prepackaged_rules', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getExistingPrepackagedRules', () => {
    test('should return a single item in a single page', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const rules = await getExistingPrepackagedRules({ alertsClient });
      expect(rules).toEqual([getResult()]);
    });

    test('should return 3 items over 1 page with all on one page', async () => {
      const alertsClient = alertsClientMock.create();

      const result1 = getResult();
      result1.params.immutable = true;
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result2 = getResult();
      result2.params.immutable = true;
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result3 = getResult();
      result3.params.immutable = true;
      result3.id = 'f3e1bf0b-b95f-43da-b1de-5d2f0af2287a';

      // first result mock which is for returning the total
      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({
          data: [result1],
          perPage: 1,
          page: 1,
          total: 3,
        })
      );

      // second mock which will return all the data on a single page
      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({
          data: [result1, result2, result3],
          perPage: 3,
          page: 1,
          total: 3,
        })
      );

      const rules = await getExistingPrepackagedRules({ alertsClient });
      expect(rules).toEqual([result1, result2, result3]);
    });
  });

  describe('getNonPackagedRules', () => {
    test('should return a single item in a single page', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const rules = await getNonPackagedRules({ alertsClient });
      expect(rules).toEqual([getResult()]);
    });

    test('should return 2 items over 1 page', async () => {
      const alertsClient = alertsClientMock.create();

      const result1 = getResult();
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result2 = getResult();
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      // first result mock which is for returning the total
      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({
          data: [result1],
          perPage: 1,
          page: 1,
          total: 2,
        })
      );

      // second mock which will return all the data on a single page
      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({ data: [result1, result2], perPage: 2, page: 1, total: 2 })
      );

      const rules = await getNonPackagedRules({ alertsClient });
      expect(rules).toEqual([result1, result2]);
    });

    test('should return 3 items over 1 page with all on one page', async () => {
      const alertsClient = alertsClientMock.create();

      const result1 = getResult();
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result2 = getResult();
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result3 = getResult();
      result3.id = 'f3e1bf0b-b95f-43da-b1de-5d2f0af2287a';

      // first result mock which is for returning the total
      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({
          data: [result1],
          perPage: 3,
          page: 1,
          total: 3,
        })
      );

      // second mock which will return all the data on a single page
      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({
          data: [result1, result2, result3],
          perPage: 3,
          page: 1,
          total: 3,
        })
      );

      const rules = await getNonPackagedRules({ alertsClient });
      expect(rules).toEqual([result1, result2, result3]);
    });
  });

  describe('getRules', () => {
    test('should return a single item in a single page', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const rules = await getRules({ alertsClient, filter: '' });
      expect(rules).toEqual([getResult()]);
    });

    test('should return 2 items over two pages, one per page', async () => {
      const alertsClient = alertsClientMock.create();

      const result1 = getResult();
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result2 = getResult();
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      // first result mock which is for returning the total
      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({
          data: [result1],
          perPage: 1,
          page: 1,
          total: 2,
        })
      );

      // second mock which will return all the data on a single page
      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({ data: [result1, result2], perPage: 2, page: 1, total: 2 })
      );

      const rules = await getRules({ alertsClient, filter: '' });
      expect(rules).toEqual([result1, result2]);
    });
  });

  describe('getRulesCount', () => {
    test('it returns a count', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const rules = await getRulesCount({ alertsClient, filter: '' });
      expect(rules).toEqual(1);
    });
  });

  describe('getNonPackagedRulesCount', () => {
    test('it returns a count', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const rules = await getNonPackagedRulesCount({ alertsClient });
      expect(rules).toEqual(1);
    });
  });
});
