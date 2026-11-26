/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft, isRight } from 'fp-ts/Either';
import {
  createLiveQueryRequestBodySchema,
  MAX_DISTINCT_ALERT_IDS,
} from './create_live_query_route';

describe('createLiveQueryRequestBodySchema alert_ids', () => {
  const ids = (count: number) => Array.from({ length: count }, (_, index) => `alert-${index}`);

  it('accepts exactly the maximum number of distinct ids', () => {
    expect(
      isRight(createLiveQueryRequestBodySchema.decode({ alert_ids: ids(MAX_DISTINCT_ALERT_IDS) }))
    ).toBe(true);
  });

  it('rejects more than the maximum number of distinct ids', () => {
    expect(
      isLeft(
        createLiveQueryRequestBodySchema.decode({ alert_ids: ids(MAX_DISTINCT_ALERT_IDS + 1) })
      )
    ).toBe(true);
  });

  it('counts distinct ids, not duplicates', () => {
    expect(
      isRight(
        createLiveQueryRequestBodySchema.decode({
          alert_ids: Array.from({ length: MAX_DISTINCT_ALERT_IDS * 2 }, () => 'alert-1'),
        })
      )
    ).toBe(true);
  });

  it.each([[['']], [['', 'alert-1']], [['alert-1', '']]])('rejects empty ids in %j', (alertIds) => {
    expect(isLeft(createLiveQueryRequestBodySchema.decode({ alert_ids: alertIds }))).toBe(true);
  });

  it('rejects non-string entries', () => {
    expect(isLeft(createLiveQueryRequestBodySchema.decode({ alert_ids: [1] }))).toBe(true);
  });
});
