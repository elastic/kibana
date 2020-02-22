/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortId, sampleRule } from './__mocks__/es_results';
import {
  buildSignal,
  buildAncestor,
  buildAncestorsSignal,
  removeInternalTagsFromRule,
} from './build_signal';
import { Signal, Ancestor } from './types';
import { INTERNAL_RULE_ID_KEY, INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';

describe('buildSignal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it builds a signal as expected without original_event if event does not exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    delete doc._source.event;
    const rule = sampleRule();
    const signal = buildSignal(doc, rule);
    const expected: Signal = {
      parent: {
        rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
      ancestors: [
        {
          rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
      ],
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
    const rule = sampleRule();
    const signal = buildSignal(doc, rule);
    const expected: Signal = {
      parent: {
        rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
      ancestors: [
        {
          rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
      ],
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

  test('it builds a signal as expected with original_event if is present and without internal tags in them', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const rule = sampleRule();
    rule.tags = [
      'some fake tag 1',
      'some fake tag 2',
      `${INTERNAL_RULE_ID_KEY}:rule-1`,
      `${INTERNAL_IMMUTABLE_KEY}:true`,
    ];
    const signal = buildSignal(doc, rule);
    const expected: Signal = {
      parent: {
        rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
      ancestors: [
        {
          rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
      ],
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

  test('it builds a ancestor correctly if the parent does not exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const rule = sampleRule();
    const signal = buildAncestor(doc, rule);
    const expected: Ancestor = {
      rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'event',
      index: 'myFakeSignalIndex',
      depth: 1,
    };
    expect(signal).toEqual(expected);
  });

  test('it builds a ancestor correctly if the parent does exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    doc._source.signal = {
      parent: {
        rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
        id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
      ancestors: [
        {
          rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
          id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
      ],
    };
    const rule = sampleRule();
    const signal = buildAncestor(doc, rule);
    const expected: Ancestor = {
      rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'signal',
      index: 'myFakeSignalIndex',
      depth: 2,
    };
    expect(signal).toEqual(expected);
  });

  test('it builds a ancestor correctly if the parent does exist without internal tags in them', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    doc._source.signal = {
      parent: {
        rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
        id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
      ancestors: [
        {
          rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
          id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
      ],
    };
    const rule = sampleRule();
    rule.tags = [
      'some fake tag 1',
      'some fake tag 2',
      `${INTERNAL_RULE_ID_KEY}:rule-1`,
      `${INTERNAL_IMMUTABLE_KEY}:true`,
    ];

    const signal = buildAncestor(doc, rule);
    const expected: Ancestor = {
      rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'signal',
      index: 'myFakeSignalIndex',
      depth: 2,
    };
    expect(signal).toEqual(expected);
  });

  test('it builds a signal ancestor correctly if the parent does not exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const rule = sampleRule();
    const signal = buildAncestorsSignal(doc, rule);
    const expected: Ancestor[] = [
      {
        rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
    ];
    expect(signal).toEqual(expected);
  });

  test('it builds a signal ancestor correctly if the parent does exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    doc._source.signal = {
      parent: {
        rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
        id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
      ancestors: [
        {
          rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
          id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
      ],
    };
    const rule = sampleRule();
    const signal = buildAncestorsSignal(doc, rule);
    const expected: Ancestor[] = [
      {
        rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
        id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
      {
        rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'signal',
        index: 'myFakeSignalIndex',
        depth: 2,
      },
    ];
    expect(signal).toEqual(expected);
  });

  test('it removes internal tags from a typical rule', () => {
    const rule = sampleRule();
    rule.tags = [
      'some fake tag 1',
      'some fake tag 2',
      `${INTERNAL_RULE_ID_KEY}:rule-1`,
      `${INTERNAL_IMMUTABLE_KEY}:true`,
    ];
    const noInternals = removeInternalTagsFromRule(rule);
    expect(noInternals).toEqual(sampleRule());
  });

  test('it works with an empty array', () => {
    const rule = sampleRule();
    rule.tags = [];
    const noInternals = removeInternalTagsFromRule(rule);
    const expected = sampleRule();
    expected.tags = [];
    expect(noInternals).toEqual(expected);
  });

  test('it works if tags does not exist', () => {
    const rule = sampleRule();
    delete rule.tags;
    const noInternals = removeInternalTagsFromRule(rule);
    const expected = sampleRule();
    delete expected.tags;
    expect(noInternals).toEqual(expected);
  });

  test('it works if tags contains normal values and no internal values', () => {
    const rule = sampleRule();
    const noInternals = removeInternalTagsFromRule(rule);
    expect(noInternals).toEqual(rule);
  });
});
