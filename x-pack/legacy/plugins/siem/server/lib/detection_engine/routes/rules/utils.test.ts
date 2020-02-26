/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Readable } from 'stream';
import {
  transformAlertToRule,
  getIdError,
  transformFindAlerts,
  transform,
  transformTags,
  getIdBulkError,
  transformOrBulkError,
  transformRulesToNdjson,
  transformAlertsToRules,
  transformOrImportError,
  getDuplicates,
  getTupleDuplicateErrorsAndUniqueRules,
} from './utils';
import { getResult } from '../__mocks__/request_responses';
import { INTERNAL_IDENTIFIER } from '../../../../../common/constants';
import { OutputRuleAlertRest, ImportRuleAlertRest, RuleAlertParamsRest } from '../../types';
import { BulkError, ImportSuccessError } from '../utils';
import { sampleRule } from '../../signals/__mocks__/es_results';
import { getSimpleRule } from '../__mocks__/utils';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { createPromiseFromStreams } from '../../../../../../../../../src/legacy/utils/streams';

type PromiseFromStreams = ImportRuleAlertRest | Error;

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
        timeline_title: 'some-timeline-title',
        to: 'now',
        type: 'query',
        version: 1,
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
        timeline_title: 'some-timeline-title',
        to: 'now',
        type: 'query',
        version: 1,
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
        timeline_title: 'some-timeline-title',
        to: 'now',
        type: 'query',
        version: 1,
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
        timeline_title: 'some-timeline-title',
        to: 'now',
        type: 'query',
        version: 1,
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
        timeline_title: 'some-timeline-title',
        to: 'now',
        type: 'query',
        version: 1,
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
        timeline_title: 'some-timeline-title',
        to: 'now',
        type: 'query',
        version: 1,
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
        timeline_title: 'some-timeline-title',
        to: 'now',
        type: 'query',
        version: 1,
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
        timeline_title: 'some-timeline-title',
        to: 'now',
        type: 'query',
        version: 1,
      };
      expect(rule).toEqual(expected);
    });
  });

  describe('getIdError', () => {
    test('it should have a status code', () => {
      const error = getIdError({ id: '123', ruleId: undefined });
      expect(error).toEqual({
        message: 'id: "123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about id not being found if only id is defined and ruleId is undefined', () => {
      const error = getIdError({ id: '123', ruleId: undefined });
      expect(error).toEqual({
        message: 'id: "123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about id not being found if only id is defined and ruleId is null', () => {
      const error = getIdError({ id: '123', ruleId: null });
      expect(error).toEqual({
        message: 'id: "123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is undefined', () => {
      const error = getIdError({ id: undefined, ruleId: 'rule-id-123' });
      expect(error).toEqual({
        message: 'rule_id: "rule-id-123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is null', () => {
      const error = getIdError({ id: null, ruleId: 'rule-id-123' });
      expect(error).toEqual({
        message: 'rule_id: "rule-id-123" not found',
        statusCode: 404,
      });
    });

    test('outputs message about both being not defined when both are undefined', () => {
      const error = getIdError({ id: undefined, ruleId: undefined });
      expect(error).toEqual({
        message: 'id or rule_id should have been defined',
        statusCode: 404,
      });
    });

    test('outputs message about both being not defined when both are null', () => {
      const error = getIdError({ id: null, ruleId: null });
      expect(error).toEqual({
        message: 'id or rule_id should have been defined',
        statusCode: 404,
      });
    });

    test('outputs message about both being not defined when id is null and ruleId is undefined', () => {
      const error = getIdError({ id: null, ruleId: undefined });
      expect(error).toEqual({
        message: 'id or rule_id should have been defined',
        statusCode: 404,
      });
    });

    test('outputs message about both being not defined when id is undefined and ruleId is null', () => {
      const error = getIdError({ id: undefined, ruleId: null });
      expect(error).toEqual({
        message: 'id or rule_id should have been defined',
        statusCode: 404,
      });
    });
  });

  describe('transformFindAlerts', () => {
    test('outputs empty data set when data set is empty correct', () => {
      const output = transformFindAlerts({ data: [] });
      expect(output).toEqual({ data: [] });
    });

    test('outputs 200 if the data is of type siem alert', () => {
      const output = transformFindAlerts({
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
        timeline_title: 'some-timeline-title',
        version: 1,
      };
      expect(output).toEqual({
        data: [expected],
      });
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const output = transformFindAlerts({ data: [{ random: 1 }] });
      expect(output).toBeNull();
    });
  });

  describe('transformOrError', () => {
    test('outputs 200 if the data is of type siem alert', () => {
      const output = transform(getResult());
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
        timeline_title: 'some-timeline-title',
        version: 1,
      };
      expect(output).toEqual(expected);
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const output = transform({ data: [{ random: 1 }] });
      expect(output).toBeNull();
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

  describe('getIdBulkError', () => {
    test('outputs message about id and rule_id not being found if both are not null', () => {
      const error = getIdBulkError({ id: '123', ruleId: '456' });
      const expected: BulkError = {
        id: '123',
        rule_id: '456',
        error: { message: 'id: "123" and rule_id: "456" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about id not being found if only id is defined and ruleId is undefined', () => {
      const error = getIdBulkError({ id: '123', ruleId: undefined });
      const expected: BulkError = {
        id: '123',
        error: { message: 'id: "123" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about id not being found if only id is defined and ruleId is null', () => {
      const error = getIdBulkError({ id: '123', ruleId: null });
      const expected: BulkError = {
        id: '123',
        error: { message: 'id: "123" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is undefined', () => {
      const error = getIdBulkError({ id: undefined, ruleId: 'rule-id-123' });
      const expected: BulkError = {
        rule_id: 'rule-id-123',
        error: { message: 'rule_id: "rule-id-123" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is null', () => {
      const error = getIdBulkError({ id: null, ruleId: 'rule-id-123' });
      const expected: BulkError = {
        rule_id: 'rule-id-123',
        error: { message: 'rule_id: "rule-id-123" not found', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about both being not defined when both are undefined', () => {
      const error = getIdBulkError({ id: undefined, ruleId: undefined });
      const expected: BulkError = {
        rule_id: '(unknown id)',
        error: { message: 'id or rule_id should have been defined', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about both being not defined when both are null', () => {
      const error = getIdBulkError({ id: null, ruleId: null });
      const expected: BulkError = {
        rule_id: '(unknown id)',
        error: { message: 'id or rule_id should have been defined', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about both being not defined when id is null and ruleId is undefined', () => {
      const error = getIdBulkError({ id: null, ruleId: undefined });
      const expected: BulkError = {
        rule_id: '(unknown id)',
        error: { message: 'id or rule_id should have been defined', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });

    test('outputs message about both being not defined when id is undefined and ruleId is null', () => {
      const error = getIdBulkError({ id: undefined, ruleId: null });
      const expected: BulkError = {
        rule_id: '(unknown id)',
        error: { message: 'id or rule_id should have been defined', status_code: 404 },
      };
      expect(error).toEqual(expected);
    });
  });

  describe('transformOrBulkError', () => {
    test('outputs 200 if the data is of type siem alert', () => {
      const output = transformOrBulkError('rule-1', getResult());
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
        timeline_title: 'some-timeline-title',
        version: 1,
      };
      expect(output).toEqual(expected);
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const output = transformOrBulkError('rule-1', { data: [{ random: 1 }] });
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'Internal error transforming', status_code: 500 },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('transformRulesToNdjson', () => {
    test('if rules are empty it returns an empty string', () => {
      const ruleNdjson = transformRulesToNdjson([]);
      expect(ruleNdjson).toEqual('');
    });

    test('single rule will transform with new line ending character for ndjson', () => {
      const rule = sampleRule();
      const ruleNdjson = transformRulesToNdjson([rule]);
      expect(ruleNdjson.endsWith('\n')).toBe(true);
    });

    test('multiple rules will transform with two new line ending characters for ndjson', () => {
      const result1 = sampleRule();
      const result2 = sampleRule();
      result2.id = 'some other id';
      result2.rule_id = 'some other id';
      result2.name = 'Some other rule';

      const ruleNdjson = transformRulesToNdjson([result1, result2]);
      // this is how we count characters in JavaScript :-)
      const count = ruleNdjson.split('\n').length - 1;
      expect(count).toBe(2);
    });

    test('you can parse two rules back out without errors', () => {
      const result1 = sampleRule();
      const result2 = sampleRule();
      result2.id = 'some other id';
      result2.rule_id = 'some other id';
      result2.name = 'Some other rule';

      const ruleNdjson = transformRulesToNdjson([result1, result2]);
      const ruleStrings = ruleNdjson.split('\n');
      const reParsed1 = JSON.parse(ruleStrings[0]);
      const reParsed2 = JSON.parse(ruleStrings[1]);
      expect(reParsed1).toEqual(result1);
      expect(reParsed2).toEqual(result2);
    });
  });

  describe('transformAlertsToRules', () => {
    test('given an empty array returns an empty array', () => {
      expect(transformAlertsToRules([])).toEqual([]);
    });

    test('given single alert will return the alert transformed', () => {
      const result1 = getResult();
      const transformed = transformAlertsToRules([result1]);
      expect(transformed).toEqual([
        {
          created_at: '2019-12-13T16:40:33.400Z',
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
          language: 'kuery',
          max_signals: 100,
          meta: { someMeta: 'someField' },
          name: 'Detect Root/Admin Users',
          output_index: '.siem-signals',
          query: 'user.name: root or user.name: admin',
          references: ['http://www.example.com', 'https://ww.example.com'],
          risk_score: 50,
          rule_id: 'rule-1',
          saved_id: 'some-id',
          severity: 'high',
          tags: [],
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
          timeline_id: 'some-timeline-id',
          timeline_title: 'some-timeline-title',
          to: 'now',
          type: 'query',
          updated_at: '2019-12-13T16:40:33.400Z',
          updated_by: 'elastic',
          version: 1,
        },
      ]);
    });

    test('given two alerts will return the two alerts transformed', () => {
      const result1 = getResult();
      const result2 = getResult();
      result2.id = 'some other id';
      result2.params.ruleId = 'some other id';

      const transformed = transformAlertsToRules([result1, result2]);
      expect(transformed).toEqual([
        {
          created_at: '2019-12-13T16:40:33.400Z',
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
          language: 'kuery',
          max_signals: 100,
          meta: { someMeta: 'someField' },
          name: 'Detect Root/Admin Users',
          output_index: '.siem-signals',
          query: 'user.name: root or user.name: admin',
          references: ['http://www.example.com', 'https://ww.example.com'],
          risk_score: 50,
          rule_id: 'rule-1',
          saved_id: 'some-id',
          severity: 'high',
          tags: [],
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
          timeline_id: 'some-timeline-id',
          timeline_title: 'some-timeline-title',
          to: 'now',
          type: 'query',
          updated_at: '2019-12-13T16:40:33.400Z',
          updated_by: 'elastic',
          version: 1,
        },
        {
          created_at: '2019-12-13T16:40:33.400Z',
          created_by: 'elastic',
          description: 'Detecting root and admin users',
          enabled: true,
          false_positives: [],
          filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
          from: 'now-6m',
          id: 'some other id',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          max_signals: 100,
          meta: { someMeta: 'someField' },
          name: 'Detect Root/Admin Users',
          output_index: '.siem-signals',
          query: 'user.name: root or user.name: admin',
          references: ['http://www.example.com', 'https://ww.example.com'],
          risk_score: 50,
          rule_id: 'some other id',
          saved_id: 'some-id',
          severity: 'high',
          tags: [],
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
          timeline_id: 'some-timeline-id',
          timeline_title: 'some-timeline-title',
          to: 'now',
          type: 'query',
          updated_at: '2019-12-13T16:40:33.400Z',
          updated_by: 'elastic',
          version: 1,
        },
      ]);
    });
  });

  describe('transformOrImportError', () => {
    test('returns 1 given success if the alert is an alert type and the existing success count is 0', () => {
      const output = transformOrImportError('rule-1', getResult(), {
        success: true,
        success_count: 0,
        errors: [],
      });
      const expected: ImportSuccessError = {
        success: true,
        errors: [],
        success_count: 1,
      };
      expect(output).toEqual(expected);
    });

    test('returns 2 given successes if the alert is an alert type and the existing success count is 1', () => {
      const output = transformOrImportError('rule-1', getResult(), {
        success: true,
        success_count: 1,
        errors: [],
      });
      const expected: ImportSuccessError = {
        success: true,
        errors: [],
        success_count: 2,
      };
      expect(output).toEqual(expected);
    });

    test('returns 1 error and success of false if the data is not of type siem alert', () => {
      const output = transformOrImportError(
        'rule-1',
        { data: [{ random: 1 }] },
        {
          success: true,
          success_count: 1,
          errors: [],
        }
      );
      const expected: ImportSuccessError = {
        success: false,
        errors: [
          {
            rule_id: 'rule-1',
            error: {
              message: 'Internal error transforming',
              status_code: 500,
            },
          },
        ],
        success_count: 1,
      };
      expect(output).toEqual(expected);
    });
  });

  describe('getDuplicates', () => {
    test("returns array of ruleIds showing the duplicate keys of 'value2' and 'value3'", () => {
      const output = getDuplicates(
        [
          { rule_id: 'value1' },
          { rule_id: 'value2' },
          { rule_id: 'value2' },
          { rule_id: 'value3' },
          { rule_id: 'value3' },
          {},
          {},
        ] as RuleAlertParamsRest[],
        'rule_id'
      );
      const expected = ['value2', 'value3'];
      expect(output).toEqual(expected);
    });
    test('returns null when given a map of no duplicates', () => {
      const output = getDuplicates(
        [
          { rule_id: 'value1' },
          { rule_id: 'value2' },
          { rule_id: 'value3' },
          {},
          {},
        ] as RuleAlertParamsRest[],
        'rule_id'
      );
      const expected: string[] = [];
      expect(output).toEqual(expected);
    });
  });

  describe('getTupleDuplicateErrorsAndUniqueRules', () => {
    test('returns tuple of empty duplicate errors array and rule array with instance of Syntax Error when imported rule contains parse error', async () => {
      const multipartPayload =
        '{"name"::"Simple Rule Query","description":"Simple Rule Query","risk_score":1,"rule_id":"rule-1","severity":"high","type":"query","query":"user.name: root or user.name: admin"}\n';
      const ndJsonStream = new Readable({
        read() {
          this.push(multipartPayload);
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const [errors, output] = getTupleDuplicateErrorsAndUniqueRules(parsedObjects, false);
      const isInstanceOfError = output[0] instanceof Error;

      expect(isInstanceOfError).toEqual(true);
      expect(errors.length).toEqual(0);
    });

    test('returns tuple of duplicate conflict error and single rule when rules with matching rule-ids passed in and `overwrite` is false', async () => {
      const rule = getSimpleRule('rule-1');
      const rule2 = getSimpleRule('rule-1');
      const ndJsonStream = new Readable({
        read() {
          this.push(`${JSON.stringify(rule)}\n`);
          this.push(`${JSON.stringify(rule2)}\n`);
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const [errors, output] = getTupleDuplicateErrorsAndUniqueRules(parsedObjects, false);

      expect(output.length).toEqual(1);
      expect(errors).toEqual([
        {
          error: {
            message: 'More than one rule with rule-id: "rule-1" found',
            status_code: 400,
          },
          rule_id: 'rule-1',
        },
      ]);
    });

    test('returns tuple of empty duplicate errors array and single rule when rules with matching rule-ids passed in and `overwrite` is true', async () => {
      const rule = getSimpleRule('rule-1');
      const rule2 = getSimpleRule('rule-1');
      const ndJsonStream = new Readable({
        read() {
          this.push(`${JSON.stringify(rule)}\n`);
          this.push(`${JSON.stringify(rule2)}\n`);
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const [errors, output] = getTupleDuplicateErrorsAndUniqueRules(parsedObjects, true);

      expect(output.length).toEqual(1);
      expect(errors.length).toEqual(0);
    });

    test('returns tuple of empty duplicate errors array and single rule when rules without a rule-id is passed in', async () => {
      const simpleRule = getSimpleRule();
      delete simpleRule.rule_id;
      const multipartPayload = `${JSON.stringify(simpleRule)}\n`;
      const ndJsonStream = new Readable({
        read() {
          this.push(multipartPayload);
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const [errors, output] = getTupleDuplicateErrorsAndUniqueRules(parsedObjects, false);
      const isInstanceOfError = output[0] instanceof Error;

      expect(isInstanceOfError).toEqual(true);
      expect(errors.length).toEqual(0);
    });
  });
});
