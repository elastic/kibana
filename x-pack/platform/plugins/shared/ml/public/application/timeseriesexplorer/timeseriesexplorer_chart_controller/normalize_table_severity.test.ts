/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeSeverityThresholdForApi } from './normalize_table_severity';

describe('normalizeSeverityThresholdForApi', () => {
  it('passes through arrays (embeddable / wrapper)', () => {
    const arr = [{ min: 50 }];
    expect(normalizeSeverityThresholdForApi(arr)).toBe(arr);
  });

  it('reads .val from SMV page shape', () => {
    expect(normalizeSeverityThresholdForApi({ val: [{ min: 10 }] })).toEqual([{ min: 10 }]);
  });

  it('wraps numeric legacy severity', () => {
    expect(normalizeSeverityThresholdForApi(25)).toEqual([{ min: 25 }]);
  });

  it('defaults to min 0', () => {
    expect(normalizeSeverityThresholdForApi(undefined)).toEqual([{ min: 0 }]);
    expect(normalizeSeverityThresholdForApi({})).toEqual([{ min: 0 }]);
  });
});
