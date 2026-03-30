/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokPatternNode } from './types';
import type { NormalizedReviewResult } from './review/get_review_fields';
import type { GrokReviewFn } from './assemble_grok_processor';
import { assembleGrokProcessor } from './assemble_grok_processor';

const apacheNodes: GrokPatternNode[] = [
  { pattern: '[' },
  { id: 'field_1', component: 'DAY', values: ['Tue'] },
  { pattern: ' ' },
  { id: 'field_2', component: 'SYSLOGTIMESTAMP', values: ['Aug 12 19:19:16'] },
  { pattern: ' ' },
  { id: 'field_3', component: 'INT', values: ['2025'] },
  { pattern: ']' },
  { pattern: ' ' },
  { pattern: '[' },
  { id: 'field_4', component: 'LOGLEVEL', values: ['notice', 'error'] },
  { pattern: ']' },
  { pattern: ' ' },
  { id: 'field_5', component: 'GREEDYDATA', values: ['workerEnv.init() ok'] },
];

const apacheReview: NormalizedReviewResult = {
  log_source: 'Apache HTTP Server Log',
  fields: [
    {
      name: '@timestamp',
      columns: ['field_1', 'field_2', 'field_3'],
      grok_components: ['DAY', 'SYSLOGTIMESTAMP', 'YEAR'],
    },
    { name: 'log.level', columns: ['field_4'], grok_components: ['LOGLEVEL'] },
    { name: 'message', columns: ['field_5'], grok_components: ['GREEDYDATA'] },
  ],
};

const makeReviewFn =
  (review: NormalizedReviewResult): GrokReviewFn =>
  async () =>
    review;

const FROM_FIELD = 'message';

describe('assembleGrokProcessor', () => {
  it('passes both NamedFieldNode and LiteralValueNode to the processor', async () => {
    const result = await assembleGrokProcessor({
      from: FROM_FIELD,
      patternGroups: [
        {
          messages: ['[Tue Aug 12 19:19:16 2025] [notice] workerEnv.init() ok'],
          nodes: apacheNodes,
        },
      ],
      reviewFn: makeReviewFn(apacheReview),
    });

    expect(result).not.toBeNull();
    expect(result!.action).toBe('grok');
    expect(result!.from).toBe(FROM_FIELD);
    expect(result!.patterns).toHaveLength(1);

    const pattern = result!.patterns[0];
    expect(pattern).toContain('%{CUSTOM_TIMESTAMP:@timestamp}');
    expect(pattern).toContain('%{LOGLEVEL:log.level}');
    expect(pattern).toContain('%{GREEDYDATA:message}');
  });

  it('preserves pattern_definitions in the result', async () => {
    const result = await assembleGrokProcessor({
      from: FROM_FIELD,
      patternGroups: [
        {
          messages: ['[Tue Aug 12 19:19:16 2025] [notice] workerEnv.init() ok'],
          nodes: apacheNodes,
        },
      ],
      reviewFn: makeReviewFn(apacheReview),
    });

    expect(result).not.toBeNull();
    expect(result!.pattern_definitions).toBeDefined();
    expect(result!.pattern_definitions).toHaveProperty('CUSTOM_TIMESTAMP');
    expect(result!.pattern_definitions!.CUSTOM_TIMESTAMP).toBe('%{DAY} %{SYSLOGTIMESTAMP} %{YEAR}');
  });

  it('filters out empty patterns and returns null when all are empty', async () => {
    const emptyNodes: GrokPatternNode[] = [{ pattern: ' ' }];
    const emptyReview: NormalizedReviewResult = { log_source: 'unknown', fields: [] };

    const result = await assembleGrokProcessor({
      from: FROM_FIELD,
      patternGroups: [{ messages: ['hello'], nodes: emptyNodes }],
      reviewFn: makeReviewFn(emptyReview),
    });

    expect(result).toBeNull();
  });

  it('returns null when all groups fail', async () => {
    const failingReviewFn: GrokReviewFn = async () => {
      throw new Error('LLM unavailable');
    };

    const result = await assembleGrokProcessor({
      from: FROM_FIELD,
      patternGroups: [{ messages: ['test'], nodes: apacheNodes }],
      reviewFn: failingReviewFn,
    });

    expect(result).toBeNull();
  });

  it('still returns a result when one of multiple groups fails', async () => {
    let callCount = 0;
    const partialFailReviewFn: GrokReviewFn = async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('first group fails');
      }
      return apacheReview;
    };

    const result = await assembleGrokProcessor({
      from: FROM_FIELD,
      patternGroups: [
        { messages: ['will fail'], nodes: apacheNodes },
        { messages: ['[Tue Aug 12 19:19:16 2025] [notice] ok'], nodes: apacheNodes },
      ],
      reviewFn: partialFailReviewFn,
    });

    expect(result).not.toBeNull();
    expect(result!.patterns.length).toBeGreaterThan(0);
  });

  it('merges pattern_definitions across groups with key deduplication', async () => {
    const reviewFn: GrokReviewFn = async () => apacheReview;

    const result = await assembleGrokProcessor({
      from: FROM_FIELD,
      patternGroups: [
        { messages: ['msg1'], nodes: apacheNodes },
        { messages: ['msg2'], nodes: apacheNodes },
      ],
      reviewFn,
    });

    expect(result).not.toBeNull();
    expect(result!.pattern_definitions).toHaveProperty('CUSTOM_TIMESTAMP');
    expect(result!.pattern_definitions).toHaveProperty('CUSTOM_TIMESTAMP2');
  });
});
