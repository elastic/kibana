/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gapAutoFillSchedulerBodySchema, gapAutoFillSchedulerLogsRequestQuerySchema } from './v1';
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

  test('rejects duplicate rule_types', () => {
    const body = {
      ...getBody(),
      rule_types: [...getBody().rule_types, ...getBody().rule_types],
    };
    expect(() => gapAutoFillSchedulerBodySchema.validate(body)).toThrow(
      `rule_types contains duplicate entry: type="rule-type-1" consumer="alerts"`
    );
  });
});

describe('gapAutoFillSchedulerLogsRequestQuerySchema', () => {
  test('allows valid start and end dates', () => {
    expect(() =>
      gapAutoFillSchedulerLogsRequestQuerySchema.validate({
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-01-02T00:00:00.000Z',
        page: 1,
        per_page: 50,
        sort_field: '@timestamp',
        sort_direction: 'desc',
      })
    ).not.toThrow();
  });

  test('rejects invalid start date', () => {
    expect(() =>
      gapAutoFillSchedulerLogsRequestQuerySchema.validate({
        start: 'invalid-date',
        end: '2024-01-02T00:00:00.000Z',
        page: 1,
        per_page: 50,
        sort_field: '@timestamp',
        sort_direction: 'desc',
      })
    ).toThrowErrorMatchingInlineSnapshot(`"[start]: query start must be valid date"`);
  });

  test('rejects invalid end date', () => {
    expect(() =>
      gapAutoFillSchedulerLogsRequestQuerySchema.validate({
        start: '2024-01-01T00:00:00.000Z',
        end: 'invalid-date',
        page: 1,
        per_page: 50,
        sort_field: '@timestamp',
        sort_direction: 'desc',
      })
    ).toThrowErrorMatchingInlineSnapshot(`"[end]: query end must be valid date"`);
  });
});
