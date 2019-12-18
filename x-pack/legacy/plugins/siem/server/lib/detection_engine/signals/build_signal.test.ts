/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortId, sampleRule } from './__mocks__/es_results';
import { buildSignal } from './build_signal';
import { OutputRuleAlertRest } from '../types';
import { Signal } from './types';

describe('buildSignal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it builds a signal as expected without original_event if event does not exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    delete doc._source.event;
    const rule: Partial<OutputRuleAlertRest> = sampleRule();
    const signal = buildSignal(doc, rule);
    const expected: Signal = {
      parent: {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
      original_time: 'someTimeStamp',
      status: 'open',
      rule: {
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
        tags: ['some fake tag 1', 'some fake tag 2'],
        to: 'now',
        type: 'query',
        updated_at: signal.rule.updated_at,
        created_at: signal.rule.created_at,
      },
    };
    expect(signal).toEqual(expected);
  });

  test('it builds a signal as expected with original_event if is present', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const rule: Partial<OutputRuleAlertRest> = sampleRule();
    const signal = buildSignal(doc, rule);
    const expected: Signal = {
      parent: {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
      original_time: 'someTimeStamp',
      original_event: {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'event',
        module: 'system',
      },
      status: 'open',
      rule: {
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
        tags: ['some fake tag 1', 'some fake tag 2'],
        to: 'now',
        type: 'query',
        updated_at: signal.rule.updated_at,
        created_at: signal.rule.created_at,
      },
    };
    expect(signal).toEqual(expected);
  });
});
