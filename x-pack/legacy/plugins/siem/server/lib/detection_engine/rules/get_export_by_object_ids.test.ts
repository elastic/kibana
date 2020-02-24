/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsClientMock } from '../../../../../alerting/server/alerts_client.mock';
import { getExportByObjectIds, getRulesFromObjects, RulesErrors } from './get_export_by_object_ids';
import {
  getResult,
  getFindResultWithSingleHit,
  FindHit,
} from '../routes/__mocks__/request_responses';
import { AlertsClient } from '../../../../../alerting';

describe('get_export_by_object_ids', () => {
  describe('getExportByObjectIds', () => {
    test('it exports object ids into an expected string with new line characters', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getExportByObjectIds(unsafeCast, objects);
      expect(exports).toEqual({
        rulesNdjson:
          '{"created_at":"2019-12-13T16:40:33.400Z","updated_at":"2019-12-13T16:40:33.400Z","created_by":"elastic","description":"Detecting root and admin users","enabled":true,"false_positives":[],"filters":[{"query":{"match_phrase":{"host.name":"some-host"}}}],"from":"now-6m","id":"04128c15-0d1b-4716-a4c5-46997ac7f3bd","immutable":false,"index":["auditbeat-*","filebeat-*","packetbeat-*","winlogbeat-*"],"interval":"5m","rule_id":"rule-1","language":"kuery","output_index":".siem-signals","max_signals":100,"risk_score":50,"name":"Detect Root/Admin Users","query":"user.name: root or user.name: admin","references":["http://www.example.com","https://ww.example.com"],"saved_id":"some-id","timeline_id":"some-timeline-id","timeline_title":"some-timeline-title","meta":{"someMeta":"someField"},"severity":"high","updated_by":"elastic","tags":[],"to":"now","type":"query","threat":[{"framework":"MITRE ATT&CK","tactic":{"id":"TA0040","name":"impact","reference":"https://attack.mitre.org/tactics/TA0040/"},"technique":[{"id":"T1499","name":"endpoint denial of service","reference":"https://attack.mitre.org/techniques/T1499/"}]}],"version":1}\n',
        exportDetails: '{"exported_count":1,"missing_rules":[],"missing_rules_count":0}\n',
      });
    });

    test('it does not export immutable rules', async () => {
      const alertsClient = alertsClientMock.create();
      const result = getResult();
      result.params.immutable = true;

      const findResult: FindHit = {
        page: 1,
        perPage: 1,
        total: 0,
        data: [result],
      };

      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(findResult);

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getExportByObjectIds(unsafeCast, objects);
      expect(exports).toEqual({
        rulesNdjson: '',
        exportDetails:
          '{"exported_count":0,"missing_rules":[{"rule_id":"rule-1"}],"missing_rules_count":1}\n',
      });
    });
  });

  describe('getRulesFromObjects', () => {
    test('it returns transformed rules from objects sent in', async () => {
      const alertsClient = alertsClientMock.create();
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getRulesFromObjects(unsafeCast, objects);
      const expected: RulesErrors = {
        exportedCount: 1,
        missingRules: [],
        rules: [
          {
            created_at: '2019-12-13T16:40:33.400Z',
            updated_at: '2019-12-13T16:40:33.400Z',
            created_by: 'elastic',
            description: 'Detecting root and admin users',
            enabled: true,
            false_positives: [],
            filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
            from: 'now-6m',
            id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            immutable: false,
            index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            interval: '5m',
            rule_id: 'rule-1',
            language: 'kuery',
            output_index: '.siem-signals',
            max_signals: 100,
            risk_score: 50,
            name: 'Detect Root/Admin Users',
            query: 'user.name: root or user.name: admin',
            references: ['http://www.example.com', 'https://ww.example.com'],
            saved_id: 'some-id',
            timeline_id: 'some-timeline-id',
            timeline_title: 'some-timeline-title',
            meta: { someMeta: 'someField' },
            severity: 'high',
            updated_by: 'elastic',
            tags: [],
            to: 'now',
            type: 'query',
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0040',
                  name: 'impact',
                  reference: 'https://attack.mitre.org/tactics/TA0040/',
                },
                technique: [
                  {
                    id: 'T1499',
                    name: 'endpoint denial of service',
                    reference: 'https://attack.mitre.org/techniques/T1499/',
                  },
                ],
              },
            ],
            version: 1,
          },
        ],
      };
      expect(exports).toEqual(expected);
    });

    test('it does not transform the rule if the rule is an immutable rule and designates it as a missing rule', async () => {
      const alertsClient = alertsClientMock.create();
      const result = getResult();
      result.params.immutable = true;

      const findResult: FindHit = {
        page: 1,
        perPage: 1,
        total: 0,
        data: [result],
      };

      alertsClient.get.mockResolvedValue(result);
      alertsClient.find.mockResolvedValue(findResult);

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getRulesFromObjects(unsafeCast, objects);
      const expected: RulesErrors = {
        exportedCount: 0,
        missingRules: [{ rule_id: 'rule-1' }],
        rules: [],
      };
      expect(exports).toEqual(expected);
    });

    test('it exports missing rules', async () => {
      const alertsClient = alertsClientMock.create();

      const findResult: FindHit = {
        page: 1,
        perPage: 1,
        total: 0,
        data: [],
      };

      alertsClient.get.mockRejectedValue({ output: { statusCode: 404 } });
      alertsClient.find.mockResolvedValue(findResult);

      const unsafeCast: AlertsClient = (alertsClient as unknown) as AlertsClient;
      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getRulesFromObjects(unsafeCast, objects);
      const expected: RulesErrors = {
        exportedCount: 0,
        missingRules: [{ rule_id: 'rule-1' }],
        rules: [],
      };
      expect(exports).toEqual(expected);
    });
  });
});
