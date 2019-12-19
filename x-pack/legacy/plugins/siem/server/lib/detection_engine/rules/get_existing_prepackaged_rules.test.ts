/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsClientMock } from '../../../../../alerting/server/alerts_client.mock';
import { AlertsClient } from '../../../../../alerting';
import {
  getResult,
  getFindResultWithSingleHit,
  getFindResultWithMultiHits,
} from '../routes/__mocks__/request_responses';
import { getExistingPrepackagedRules } from './get_existing_prepackaged_rules';

describe('get_existing_prepackaged_rules', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getExistingPrepackagedRules', () => {
    test('should return a single item in a single page', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const rules = await getExistingPrepackagedRules({
        alertsClient: unsafeCast,
      });
      expect(rules).toEqual([getResult()]);
    });

    test('should return 2 items over two pages, one per page', async () => {
      const alertsClient = alertsClientMock.create();

      const result1 = getResult();
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result2 = getResult();
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({ data: [result1], perPage: 1, page: 1, total: 2 })
      );
      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({ data: [result2], perPage: 1, page: 2, total: 2 })
      );

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const rules = await getExistingPrepackagedRules({
        alertsClient: unsafeCast,
      });
      expect(rules).toEqual([result1, result2]);
    });

    test('should return 3 items with over 3 pages one per page', async () => {
      const alertsClient = alertsClientMock.create();

      const result1 = getResult();
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result2 = getResult();
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result3 = getResult();
      result3.id = 'f3e1bf0b-b95f-43da-b1de-5d2f0af2287a';

      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({ data: [result1], perPage: 1, page: 1, total: 3 })
      );

      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({ data: [result2], perPage: 1, page: 2, total: 3 })
      );

      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({ data: [result3], perPage: 1, page: 2, total: 3 })
      );

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const rules = await getExistingPrepackagedRules({
        alertsClient: unsafeCast,
      });
      expect(rules).toEqual([result1, result2, result3]);
    });

    test('should return 3 items over 1 pages with all on one page', async () => {
      const alertsClient = alertsClientMock.create();

      const result1 = getResult();
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result2 = getResult();
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';

      const result3 = getResult();
      result3.id = 'f3e1bf0b-b95f-43da-b1de-5d2f0af2287a';

      alertsClient.find.mockResolvedValueOnce(
        getFindResultWithMultiHits({
          data: [result1, result2, result3],
          perPage: 3,
          page: 1,
          total: 3,
        })
      );

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const rules = await getExistingPrepackagedRules({
        alertsClient: unsafeCast,
      });
      expect(rules).toEqual([result1, result2, result3]);
    });
  });
});
