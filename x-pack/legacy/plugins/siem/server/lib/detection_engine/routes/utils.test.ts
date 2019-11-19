/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import {
  transformAlertToSignal,
  getIdError,
  transformFindAlertsOrError,
  transformOrError,
} from './utils';
import { getResult } from './__mocks__/request_responses';

describe('utils', () => {
  describe('transformAlertToSignal', () => {
    test('should work with a full data set', () => {
      const fullSignal = getResult();
      const signal = transformAlertToSignal(fullSignal);
      expect(signal).toEqual({
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        size: 1,
        updated_by: 'elastic',
        tags: [],
        to: 'now',
        type: 'query',
      });
    });

    test('should work with a partial data set missing data', () => {
      const fullSignal = getResult();
      const { from, language, ...omitData } = transformAlertToSignal(fullSignal);
      expect(omitData).toEqual({
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        rule_id: 'rule-1',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        size: 1,
        updated_by: 'elastic',
        tags: [],
        to: 'now',
        type: 'query',
      });
    });

    test('should omit query if query is null', () => {
      const fullSignal = getResult();
      fullSignal.alertTypeParams.query = null;
      const signal = transformAlertToSignal(fullSignal);
      expect(signal).toEqual({
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        size: 1,
        updated_by: 'elastic',
        tags: [],
        to: 'now',
        type: 'query',
      });
    });

    test('should omit query if query is undefined', () => {
      const fullSignal = getResult();
      fullSignal.alertTypeParams.query = undefined;
      const signal = transformAlertToSignal(fullSignal);
      expect(signal).toEqual({
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        size: 1,
        updated_by: 'elastic',
        tags: [],
        to: 'now',
        type: 'query',
      });
    });

    test('should omit a mix of undefined, null, and missing fields', () => {
      const fullSignal = getResult();
      fullSignal.alertTypeParams.query = undefined;
      fullSignal.alertTypeParams.language = null;
      const { from, enabled, ...omitData } = transformAlertToSignal(fullSignal);
      expect(omitData).toEqual({
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        false_positives: [],
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        rule_id: 'rule-1',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        size: 1,
        updated_by: 'elastic',
        tags: [],
        to: 'now',
        type: 'query',
      });
    });
  });

  describe('getIdError', () => {
    test('outputs message about id not being found if only id is defined and ruleId is undefined', () => {
      const boom = getIdError({ id: '123', ruleId: undefined });
      expect(boom.message).toEqual('id of 123 not found');
    });

    test('outputs message about id not being found if only id is defined and ruleId is null', () => {
      const boom = getIdError({ id: '123', ruleId: null });
      expect(boom.message).toEqual('id of 123 not found');
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is undefined', () => {
      const boom = getIdError({ id: undefined, ruleId: 'rule-id-123' });
      expect(boom.message).toEqual('rule_id of rule-id-123 not found');
    });

    test('outputs message about ruleId not being found if only ruleId is defined and id is null', () => {
      const boom = getIdError({ id: null, ruleId: 'rule-id-123' });
      expect(boom.message).toEqual('rule_id of rule-id-123 not found');
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
      expect(output).toEqual({
        data: [
          {
            created_by: 'elastic',
            description: 'Detecting root and admin users',
            enabled: true,
            false_positives: [],
            from: 'now-6m',
            id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            interval: '5m',
            rule_id: 'rule-1',
            language: 'kuery',
            max_signals: 100,
            name: 'Detect Root/Admin Users',
            query: 'user.name: root or user.name: admin',
            references: ['http://www.example.com', 'https://ww.example.com'],
            severity: 'high',
            size: 1,
            updated_by: 'elastic',
            tags: [],
            to: 'now',
            type: 'query',
          },
        ],
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
      expect(output).toEqual({
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        size: 1,
        updated_by: 'elastic',
        tags: [],
        to: 'now',
        type: 'query',
      });
    });

    test('returns 500 if the data is not of type siem alert', () => {
      const output = transformOrError({ data: [{ random: 1 }] });
      expect((output as Boom).message).toEqual('Internal error transforming');
    });
  });
});
