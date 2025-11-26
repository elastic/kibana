/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gapAutoFillSchedulerBodySchema } from './v1';
import { MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS } from '../../../../../constants';

const getBody = () => ({
  id: 'gap-1',
  name: 'gap auto fill',
  enabled: true,
  max_backfills: 10,
  num_retries: 3,
  gap_fill_range: 'now-1d',
  schedule: {
    interval: '1m',
  },
  scope: ['internal'],
  rule_types: [
    {
      type: 'rule-type-1',
      consumer: 'alerts',
    },
  ],
});

describe('gapAutoFillSchedulerBodySchema', () => {
  test('allows schedule intervals of at least one minute', () => {
    expect(() => gapAutoFillSchedulerBodySchema.validate(getBody())).not.toThrow();
  });

  test('allows gap_fill_range at the configured limit', () => {
    const body = {
      ...getBody(),
      gap_fill_range: 'now-90d',
    };

    expect(() => gapAutoFillSchedulerBodySchema.validate(body)).not.toThrow();
  });

  test('rejects schedule intervals shorter than one minute', () => {
    const body = {
      ...getBody(),
      schedule: {
        interval: '30s',
      },
    };

    expect(() => gapAutoFillSchedulerBodySchema.validate(body)).toThrowErrorMatchingInlineSnapshot(
      `"schedule.interval must be at least 1 minute"`
    );
  });

  test('rejects gap_fill_range that looks back too far', () => {
    const body = {
      ...getBody(),
      gap_fill_range: 'now-91d',
    };

    expect(() => gapAutoFillSchedulerBodySchema.validate(body)).toThrow(
      `gap_fill_range cannot look back more than ${MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS} days`
    );
  });
});
