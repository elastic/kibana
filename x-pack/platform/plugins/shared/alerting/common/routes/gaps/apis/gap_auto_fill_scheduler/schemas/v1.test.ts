/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gapAutoFillSchedulerBodySchema } from './v1';

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
});
