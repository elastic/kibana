/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readRules } from './read_rules';
import { alertsClientMock } from '../../../../../../../plugins/alerting/server/mocks';
import { getResult, getFindResultWithSingleHit } from '../routes/__mocks__/request_responses';

describe('read_rules', () => {
  describe('readRules', () => {
    test('should return the output from alertsClient if id is set but ruleId is undefined', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());

      const rule = await readRules({
        alertsClient,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleId: undefined,
      });
      expect(rule).toEqual(getResult());
    });

    test('should return the output from alertsClient if id is set but ruleId is null', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());

      const rule = await readRules({
        alertsClient,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleId: null,
      });
      expect(rule).toEqual(getResult());
    });

    test('should return the output from alertsClient if id is undefined but ruleId is set', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const rule = await readRules({
        alertsClient,
        id: undefined,
        ruleId: 'rule-1',
      });
      expect(rule).toEqual(getResult());
    });

    test('should return the output from alertsClient if id is null but ruleId is set', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const rule = await readRules({
        alertsClient,
        id: null,
        ruleId: 'rule-1',
      });
      expect(rule).toEqual(getResult());
    });

    test('should return null if id and ruleId are null', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const rule = await readRules({
        alertsClient,
        id: null,
        ruleId: null,
      });
      expect(rule).toEqual(null);
    });

    test('should return null if id and ruleId are undefined', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const rule = await readRules({
        alertsClient,
        id: undefined,
        ruleId: undefined,
      });
      expect(rule).toEqual(null);
    });
  });
});
