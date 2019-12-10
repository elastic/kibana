/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  sampleRuleAlertParams,
  sampleDocNoSortId,
  sampleRuleGuid,
  sampleIdGuid,
} from './__mocks__/es_results';
import { buildBulkBody } from './build_bulk_body';

describe('buildBulkBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('if bulk body builds well-defined body', () => {
    const sampleParams = sampleRuleAlertParams();
    const fakeSignalSourceHit = buildBulkBody({
      doc: sampleDocNoSortId(),
      ruleParams: sampleParams,
      id: sampleRuleGuid,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    // Timestamp will potentially always be different so remove it for the test
    delete fakeSignalSourceHit['@timestamp'];
    expect(fakeSignalSourceHit).toEqual({
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
        original_time: 'someTimeStamp',
        status: 'open',
        rule: {
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          tags: ['some fake tag 1', 'some fake tag 2'],
          type: 'query',
          to: 'now',
          enabled: true,
          created_by: 'elastic',
          updated_by: 'elastic',
        },
      },
    });
  });

  test('if bulk body builds original_event if it exists on the event to begin with', () => {
    const sampleParams = sampleRuleAlertParams();
    const doc = sampleDocNoSortId();
    doc._source.event = {
      action: 'socket_opened',
      module: 'system',
      dataset: 'socket',
      kind: 'event',
    };
    const fakeSignalSourceHit = buildBulkBody({
      doc,
      ruleParams: sampleParams,
      id: sampleRuleGuid,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    // Timestamp will potentially always be different so remove it for the test
    delete fakeSignalSourceHit['@timestamp'];
    expect(fakeSignalSourceHit).toEqual({
      someKey: 'someValue',
      event: {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'signal',
        module: 'system',
      },
      signal: {
        original_event: {
          action: 'socket_opened',
          dataset: 'socket',
          kind: 'event',
          module: 'system',
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
        original_time: 'someTimeStamp',
        status: 'open',
        rule: {
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          tags: ['some fake tag 1', 'some fake tag 2'],
          type: 'query',
          to: 'now',
          enabled: true,
          created_by: 'elastic',
          updated_by: 'elastic',
        },
      },
    });
  });

  test('if bulk body builds original_event if it exists on the event to begin with but no kind information', () => {
    const sampleParams = sampleRuleAlertParams();
    const doc = sampleDocNoSortId();
    doc._source.event = {
      action: 'socket_opened',
      module: 'system',
      dataset: 'socket',
    };
    const fakeSignalSourceHit = buildBulkBody({
      doc,
      ruleParams: sampleParams,
      id: sampleRuleGuid,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    // Timestamp will potentially always be different so remove it for the test
    delete fakeSignalSourceHit['@timestamp'];
    expect(fakeSignalSourceHit).toEqual({
      someKey: 'someValue',
      event: {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'signal',
        module: 'system',
      },
      signal: {
        original_event: {
          action: 'socket_opened',
          dataset: 'socket',
          module: 'system',
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
        original_time: 'someTimeStamp',
        status: 'open',
        rule: {
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          tags: ['some fake tag 1', 'some fake tag 2'],
          type: 'query',
          to: 'now',
          enabled: true,
          created_by: 'elastic',
          updated_by: 'elastic',
        },
      },
    });
  });

  test('if bulk body builds original_event if it exists on the event to begin with with only kind information', () => {
    const sampleParams = sampleRuleAlertParams();
    const doc = sampleDocNoSortId();
    doc._source.event = {
      kind: 'event',
    };
    const fakeSignalSourceHit = buildBulkBody({
      doc,
      ruleParams: sampleParams,
      id: sampleRuleGuid,
      name: 'rule-name',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      tags: ['some fake tag 1', 'some fake tag 2'],
    });
    // Timestamp will potentially always be different so remove it for the test
    delete fakeSignalSourceHit['@timestamp'];
    expect(fakeSignalSourceHit).toEqual({
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        original_event: {
          kind: 'event',
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
        original_time: 'someTimeStamp',
        status: 'open',
        rule: {
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          tags: ['some fake tag 1', 'some fake tag 2'],
          type: 'query',
          to: 'now',
          enabled: true,
          created_by: 'elastic',
          updated_by: 'elastic',
        },
      },
    });
  });
});
