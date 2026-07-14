/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_PARALLEL_MAX_FAN_OUT } from '@kbn/workflows';
import type { ChangePointRuleBucket } from '../../../lib/significant_events/alerting/alerts_reader';
import { batchRuleBuckets } from './batch_rule_buckets';

const createRuleBucket = (index: number): ChangePointRuleBucket => ({
  key: `rule-${index}`,
  doc_count: 1,
  rule_name: { top: [{ metrics: { 'kibana.alert.rule.name': `Rule ${index}` } }] },
  stream: { buckets: [{ key: 'logs.test' }] },
  change_points: { type: { spike: { p_value: 0.01 } } },
});

describe('batchRuleBuckets', () => {
  it('preserves every bucket while bounding each parallel fan-out batch', () => {
    const buckets = Array.from({ length: DEFAULT_PARALLEL_MAX_FAN_OUT * 2 + 1 }, (_, index) =>
      createRuleBucket(index)
    );

    const batches = batchRuleBuckets(buckets);

    expect(batches.map(({ length }) => length)).toEqual([
      DEFAULT_PARALLEL_MAX_FAN_OUT,
      DEFAULT_PARALLEL_MAX_FAN_OUT,
      1,
    ]);
    expect(batches.flat()).toEqual(buckets);
  });
});
