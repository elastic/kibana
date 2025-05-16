/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsBuckets,
  AggregationsStringTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/types';
import { replaceDotSymbols } from './replace_dots_with_underscores';

type Bucket = AggregationsStringTermsBucketKeys & { max_ignored_field: { value: number } };

export function parseMaxIgnoreRuleTypeBucket(
  ruleTypeBuckets: AggregationsBuckets<AggregationsStringTermsBucketKeys>
) {
  const buckets = ruleTypeBuckets as Bucket[];
  return (buckets ?? []).reduce((acc, bucket: Bucket) => {
    const ruleType: string = replaceDotSymbols(`${bucket.key}`);
    const maxIgnoredField: number = bucket.max_ignored_field.value ?? 0;
    acc[ruleType] = maxIgnoredField > (acc[ruleType] ?? 0) ? maxIgnoredField : acc[ruleType] ?? 0;
    return acc;
  }, {} as Record<string, number>);
}
