/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsClientMock } from '../../../../../alerting/server/alerts_client.mock';
import { readSignals, readSignalByRuleId, findSignalInArrayByRuleId } from './read_signals';
import { AlertsClient } from '../../../../../alerting';
import {
  getResult,
  getFindResultWithSingleHit,
  getFindResultWithMultiHits,
} from '../routes/__mocks__/request_responses';
import { SIGNALS_ID } from '../../../../common/constants';

describe('read_signals', () => {
  describe('readSignals', () => {
    test('should return the output from alertsClient if id is set but ruleId is undefined', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignals({
        alertsClient: unsafeCast,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleId: undefined,
      });
      expect(signal).toEqual(getResult());
    });

    test('should return the output from alertsClient if id is set but ruleId is null', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignals({
        alertsClient: unsafeCast,
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        ruleId: null,
      });
      expect(signal).toEqual(getResult());
    });

    test('should return the output from alertsClient if id is undefined but ruleId is set', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignals({
        alertsClient: unsafeCast,
        id: undefined,
        ruleId: 'rule-1',
      });
      expect(signal).toEqual(getResult());
    });

    test('should return the output from alertsClient if id is null but ruleId is set', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignals({
        alertsClient: unsafeCast,
        id: null,
        ruleId: 'rule-1',
      });
      expect(signal).toEqual(getResult());
    });

    test('should return null if id and ruleId are null', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignals({
        alertsClient: unsafeCast,
        id: null,
        ruleId: null,
      });
      expect(signal).toEqual(null);
    });

    test('should return null if id and ruleId are undefined', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignals({
        alertsClient: unsafeCast,
        id: undefined,
        ruleId: undefined,
      });
      expect(signal).toEqual(null);
    });
  });

  describe('readSignalByRuleId', () => {
    test('should return a single value if the rule id matches', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignalByRuleId({
        alertsClient: unsafeCast,
        ruleId: 'rule-1',
      });
      expect(signal).toEqual(getResult());
    });

    test('should not return a single value if the rule id does not match', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignalByRuleId({
        alertsClient: unsafeCast,
        ruleId: 'rule-that-should-not-match-anything',
      });
      expect(signal).toEqual(null);
    });

    test('should return a single value of rule-1 with multiple values', async () => {
      const result1 = getResult();
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.alertTypeParams.ruleId = 'rule-1';

      const result2 = getResult();
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.alertTypeParams.ruleId = 'rule-2';

      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithMultiHits([result1, result2]));

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignalByRuleId({
        alertsClient: unsafeCast,
        ruleId: 'rule-1',
      });
      expect(signal).toEqual(result1);
    });

    test('should return a single value of rule-2 with multiple values', async () => {
      const result1 = getResult();
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.alertTypeParams.ruleId = 'rule-1';

      const result2 = getResult();
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.alertTypeParams.ruleId = 'rule-2';

      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithMultiHits([result1, result2]));

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignalByRuleId({
        alertsClient: unsafeCast,
        ruleId: 'rule-2',
      });
      expect(signal).toEqual(result2);
    });

    test('should return null for a made up value with multiple values', async () => {
      const result1 = getResult();
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.alertTypeParams.ruleId = 'rule-1';

      const result2 = getResult();
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.alertTypeParams.ruleId = 'rule-2';

      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithMultiHits([result1, result2]));

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const signal = await readSignalByRuleId({
        alertsClient: unsafeCast,
        ruleId: 'rule-that-should-not-match-anything',
      });
      expect(signal).toEqual(null);
    });
  });

  describe('findSignalInArrayByRuleId', () => {
    test('returns null if the objects are not of a signal rule type', () => {
      const signal = findSignalInArrayByRuleId(
        [
          { alertTypeId: 'made up 1', alertTypeParams: { ruleId: '123' } },
          { alertTypeId: 'made up 2', alertTypeParams: { ruleId: '456' } },
        ],
        '123'
      );
      expect(signal).toEqual(null);
    });

    test('returns correct type if the objects are of a signal rule type', () => {
      const signal = findSignalInArrayByRuleId(
        [
          { alertTypeId: SIGNALS_ID, alertTypeParams: { ruleId: '123' } },
          { alertTypeId: 'made up 2', alertTypeParams: { ruleId: '456' } },
        ],
        '123'
      );
      expect(signal).toEqual({ alertTypeId: 'siem.signals', alertTypeParams: { ruleId: '123' } });
    });

    test('returns second correct type if the objects are of a signal rule type', () => {
      const signal = findSignalInArrayByRuleId(
        [
          { alertTypeId: SIGNALS_ID, alertTypeParams: { ruleId: '123' } },
          { alertTypeId: SIGNALS_ID, alertTypeParams: { ruleId: '456' } },
        ],
        '456'
      );
      expect(signal).toEqual({ alertTypeId: 'siem.signals', alertTypeParams: { ruleId: '456' } });
    });

    test('returns null with correct types but data does not exist', () => {
      const signal = findSignalInArrayByRuleId(
        [
          { alertTypeId: SIGNALS_ID, alertTypeParams: { ruleId: '123' } },
          { alertTypeId: SIGNALS_ID, alertTypeParams: { ruleId: '456' } },
        ],
        '892'
      );
      expect(signal).toEqual(null);
    });
  });
});
