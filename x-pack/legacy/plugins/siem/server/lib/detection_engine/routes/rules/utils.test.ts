/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import {
  transformAlertToRule,
  getIdError,
  transformFindAlertsOrError,
  transformOrError,
  transformTags,
} from './utils';
import { getResult } from '../__mocks__/request_responses';
import { INTERNAL_IDENTIFIER } from '../../../../../common/constants';
import { OutputRuleAlertRest } from '../../types';

describe('utils', () => {
  describe('transformAlertToRule', () => {
    test('should work with a full data set', () => {
      const fullRule = getResult();
      const rule = transformAlertToRule(fullRule);
      const expected: OutputRuleAlertRest = {
        created_by: 'elastic',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        risk_score: 50,
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        output_index: '.siem-signals',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: [],
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
        to: 'now',
        type: 'query',
      };
      expect(rule).toEqual(expected);
    });

    test('should work with a partial data set missing data', () => {
      const fullRule = getResult();
      const { from, language, ...omitData } = transformAlertToRule(fullRule);
      const expected: Partial<OutputRuleAlertRest> = {
        created_by: 'elastic',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        output_index: '.siem-signals',
        interval: '5m',
        risk_score: 50,
        rule_id: 'rule-1',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: [],
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
        to: 'now',
        type: 'query',
      };
      expect(omitData).toEqual(expected);
    });

    test('should omit query if query is null', () => {
      const fullRule = getResult();
      fullRule.params.query = null;
      const rule = transformAlertToRule(fullRule);
      const expected: Partial<OutputRuleAlertRest> = {
        created_by: 'elastic',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        output_index: '.siem-signals',
        interval: '5m',
        risk_score: 50,
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: [],
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
        to: 'now',
        type: 'query',
      };
      expect(rule).toEqual(expected);
    });

    test('should omit query if query is undefined', () => {
      const fullRule = getResult();
      fullRule.params.query = undefined;
      const rule = transformAlertToRule(fullRule);
      const expected: Partial<OutputRuleAlertRest> = {
        created_by: 'elastic',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        output_index: '.siem-signals',
        interval: '5m',
        rule_id: 'rule-1',
        risk_score: 50,
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: [],
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
        to: 'now',
        type: 'query',
      };
      expect(rule).toEqual(expected);
    });

    test('should omit a mix of undefined, null, and missing fields', () => {
      const fullRule = getResult();
      fullRule.params.query = undefined;
      fullRule.params.language = null;
      const { from, enabled, ...omitData } = transformAlertToRule(fullRule);
      const expected: Partial<OutputRuleAlertRest> = {
        created_by: 'elastic',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        description: 'Detecting root and admin users',
        false_positives: [],
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        output_index: '.siem-signals',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        rule_id: 'rule-1',
        risk_score: 50,
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: [],
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
        to: 'now',
        type: 'query',
      };
      expect(omitData).toEqual(expected);
    });

    test('should return enabled is equal to false', () => {
      const fullRule = getResult();
      fullRule.enabled = false;
      const ruleWithEnabledFalse = transformAlertToRule(fullRule);
      const expected: OutputRuleAlertRest = {
        created_by: 'elastic',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        description: 'Detecting root and admin users',
        enabled: false,
        from: 'now-6m',
        false_positives: [],
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        output_index: '.siem-signals',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        language: 'kuery',
        risk_score: 50,
        rule_id: 'rule-1',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: [],
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
        to: 'now',
        type: 'query',
      };
      expect(ruleWithEnabledFalse).toEqual(expected);
    });

    test('should return immutable is equal to false', () => {
      const fullRule = getResult();
      fullRule.params.immutable = false;
      const ruleWithEnabledFalse = transformAlertToRule(fullRule);
      const expected: OutputRuleAlertRest = {
        created_by: 'elastic',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        description: 'Detecting root and admin users',
        enabled: true,
        from: 'now-6m',
        false_positives: [],
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        output_index: '.siem-signals',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        language: 'kuery',
        risk_score: 50,
        rule_id: 'rule-1',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: [],
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
        to: 'now',
        type: 'query',
      };
      expect(ruleWithEnabledFalse).toEqual(expected);
    });

    test('should work with tags but filter out any internal tags', () => {
      const fullRule = getResult();
      fullRule.tags = ['tag 1', 'tag 2', `${INTERNAL_IDENTIFIER}_some_other_value`];
      const rule = transformAlertToRule(fullRule);
      const expected: OutputRuleAlertRest = {
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        risk_score: 50,
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        output_index: '.siem-signals',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: ['tag 1', 'tag 2'],
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
        to: 'now',
        type: 'query',
      };
      expect(rule).toEqual(expected);
    });
  });

  describe('getIdError', () => {
    test('outputs message about id not being found if only id is defined and ruleId is undefined', () => {
      const boom = getIdError({ id: '123', ruleId: undefined });
      expect(boom.message).toEqual('id: "123" not found');
    });

    test('outputs message about id not being found if only id is defined and ruleId is null', () => {
      const boom = getIdError({ id: '123', ruleId: null });
      expect(boom.message).toEqual('id: "123" not found');
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is undefined', () => {
      const boom = getIdError({ id: undefined, ruleId: 'rule-id-123' });
      expect(boom.message).toEqual('rule_id: "rule-id-123" not found');
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is null', () => {
      const boom = getIdError({ id: null, ruleId: 'rule-id-123' });
      expect(boom.message).toEqual('rule_id: "rule-id-123" not found');
    });

    test('outputs message about both being not defined when both are undefined', () => {
      const boom = getIdError({ id: undefined, ruleId: undefined });
      expect(boom.message).toEqual('id or rule_id should have been defined');
    });

    test('outputs message about both being not defined when both are null', () => {
      const boom = getIdError({ id: null, ruleId: null });
      expect(boom.message).toEqual('id or rule_id should have been defined');
    });

    test('outputs message about both being not defined when id is null and ruleId is undefined', () => {
      const boom = getIdError({ id: null, ruleId: undefined });
      expect(boom.message).toEqual('id or rule_id should have been defined');
    });

    test('outputs message about both being not defined when id is undefined and ruleId is null', () => {
      const boom = getIdError({ id: undefined, ruleId: null });
      expect(boom.message).toEqual('id or rule_id should have been defined');
    });
  });

  describe('transformFindAlertsOrError', () => {
    test('outputs empty data set when data set is empty correct', () => {
      const output = transformFindAlertsOrError({ data: [] });
      expect(output).toEqual({ data: [] });
    });

    test('outputs 200 if the data is of type siem alert', () => {
      const output = transformFindAlertsOrError({
        data: [getResult()],
      });
      const expected: OutputRuleAlertRest = {
        created_by: 'elastic',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        output_index: '.siem-signals',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        risk_score: 50,
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: [],
        to: 'now',
        type: 'query',
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
      };
      expect(output).toEqual({
        data: [expected],
      });
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const output = transformFindAlertsOrError({ data: [{ random: 1 }] });
      expect((output as Boom).message).toEqual('Internal error transforming');
    });
  });

  describe('transformOrError', () => {
    test('outputs 200 if the data is of type siem alert', () => {
      const output = transformOrError(getResult());
      const expected: OutputRuleAlertRest = {
        created_by: 'elastic',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        output_index: '.siem-signals',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        rule_id: 'rule-1',
        risk_score: 50,
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: [],
        to: 'now',
        type: 'query',
        threats: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            techniques: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
        ],
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'some-host',
              },
            },
          },
        ],
        meta: {
          someMeta: 'someField',
        },
        saved_id: 'some-id',
        timeline_id: 'some-timeline-id',
      };
      expect(output).toEqual(expected);
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const output = transformOrError({ data: [{ random: 1 }] });
      expect((output as Boom).message).toEqual('Internal error transforming');
    });
  });

  describe('transformTags', () => {
    test('it returns tags that have no internal structures', () => {
      expect(transformTags(['tag 1', 'tag 2'])).toEqual(['tag 1', 'tag 2']);
    });

    test('it returns empty tags given empty tags', () => {
      expect(transformTags([])).toEqual([]);
    });

    test('it returns tags with internal tags stripped out', () => {
      expect(transformTags(['tag 1', `${INTERNAL_IDENTIFIER}_some_value`, 'tag 2'])).toEqual([
        'tag 1',
        'tag 2',
      ]);
    });
  });
});
