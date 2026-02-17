/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { targetLookupQueryKeys } from './cache_keys';
import { TARGET_TYPE_INDEX_PATTERN } from '../../../target_types';

describe('targetLookupQueryKeys', () => {
  it('builds stable keys for target lookup endpoints', () => {
    expect(targetLookupQueryKeys.dataViewsList()).toEqual([
      'anonymizationTargetLookup',
      'dataViewsList',
    ]);
    expect(targetLookupQueryKeys.dataViewById('dv-1')).toEqual([
      'anonymizationTargetLookup',
      'dataViewById',
      'dv-1',
    ]);
  });

  it('normalizes resolve and wildcard dimensions', () => {
    expect(targetLookupQueryKeys.resolveIndex(' LOGS-* ', TARGET_TYPE_INDEX_PATTERN)).toEqual([
      'anonymizationTargetLookup',
      'resolveIndex',
      TARGET_TYPE_INDEX_PATTERN,
      'logs-*',
    ]);
    expect(targetLookupQueryKeys.fieldsForWildcard(' logs-* ')).toEqual([
      'anonymizationTargetLookup',
      'fieldsForWildcard',
      'logs-*',
    ]);
  });
});
