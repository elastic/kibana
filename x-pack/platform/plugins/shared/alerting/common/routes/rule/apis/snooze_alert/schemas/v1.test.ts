/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_SEVERITY_VALUES } from '@kbn/rule-data-utils';
import { snoozeAlertParamsSchema, snoozeAlertBodySchema } from './v1';
import {
  MAX_ID_LENGTH,
  MAX_SNOOZED_INSTANCE_ID_LENGTH,
  MAX_SNOOZED_INSTANCE_CONDITIONS,
  MAX_SNOOZED_CONDITION_FIELD_LENGTH,
  MAX_SNOOZE_EXPIRES_AT_LENGTH,
} from '../../../../../max_alert_limit';

const FUTURE_DATE = new Date(Date.now() + 86400000).toISOString(); // tomorrow

describe('snoozeAlertParamsSchema', () => {
  test('accepts valid rule_id and alert_id', () => {
    expect(() =>
      snoozeAlertParamsSchema.validate({ rule_id: 'rule-1', alert_id: 'alert-1' })
    ).not.toThrow();
  });

  test(`rejects rule_id longer than ${MAX_ID_LENGTH} chars`, () => {
    expect(() =>
      snoozeAlertParamsSchema.validate({
        rule_id: 'a'.repeat(MAX_ID_LENGTH + 1),
        alert_id: 'alert-1',
      })
    ).toThrow();
  });

  test(`accepts rule_id exactly ${MAX_ID_LENGTH} chars`, () => {
    expect(() =>
      snoozeAlertParamsSchema.validate({
        rule_id: 'a'.repeat(MAX_ID_LENGTH),
        alert_id: 'alert-1',
      })
    ).not.toThrow();
  });

  test(`rejects alert_id longer than ${MAX_SNOOZED_INSTANCE_ID_LENGTH} chars`, () => {
    expect(() =>
      snoozeAlertParamsSchema.validate({
        rule_id: 'rule-1',
        alert_id: 'a'.repeat(MAX_SNOOZED_INSTANCE_ID_LENGTH + 1),
      })
    ).toThrow();
  });

  test(`accepts alert_id exactly ${MAX_SNOOZED_INSTANCE_ID_LENGTH} chars`, () => {
    expect(() =>
      snoozeAlertParamsSchema.validate({
        rule_id: 'rule-1',
        alert_id: 'a'.repeat(MAX_SNOOZED_INSTANCE_ID_LENGTH),
      })
    ).not.toThrow();
  });
});

describe('snoozeAlertBodySchema', () => {
  test('accepts body with expires_at only', () => {
    expect(() => snoozeAlertBodySchema.validate({ expires_at: FUTURE_DATE })).not.toThrow();
  });

  test('accepts body with conditions only', () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: [{ type: 'severity_change' }],
      })
    ).not.toThrow();
  });

  test('accepts body with both expires_at and conditions', () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        expires_at: FUTURE_DATE,
        conditions: [{ type: 'field_change', field: 'host.name' }],
        condition_operator: 'any',
      })
    ).not.toThrow();
  });

  test(`rejects expires_at longer than ${MAX_SNOOZE_EXPIRES_AT_LENGTH} chars`, () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        expires_at: 'a'.repeat(MAX_SNOOZE_EXPIRES_AT_LENGTH + 1),
      })
    ).toThrow();
  });

  test(`rejects conditions array exceeding ${MAX_SNOOZED_INSTANCE_CONDITIONS} items`, () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: Array.from({ length: MAX_SNOOZED_INSTANCE_CONDITIONS + 1 }, () => ({
          type: 'severity_change',
        })),
      })
    ).toThrow();
  });

  test(`accepts conditions array of exactly ${MAX_SNOOZED_INSTANCE_CONDITIONS} items`, () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: Array.from({ length: MAX_SNOOZED_INSTANCE_CONDITIONS }, () => ({
          type: 'severity_change',
        })),
      })
    ).not.toThrow();
  });

  test(`rejects field_change field longer than ${MAX_SNOOZED_CONDITION_FIELD_LENGTH} chars`, () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: [
          { type: 'field_change', field: 'a'.repeat(MAX_SNOOZED_CONDITION_FIELD_LENGTH + 1) },
        ],
      })
    ).toThrow();
  });

  test(`accepts field_change field exactly ${MAX_SNOOZED_CONDITION_FIELD_LENGTH} chars`, () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: [
          { type: 'field_change', field: 'a'.repeat(MAX_SNOOZED_CONDITION_FIELD_LENGTH) },
        ],
      })
    ).not.toThrow();
  });

  test.each([...ALERT_SEVERITY_VALUES])('accepts severity_equals with value "%s"', (severity) => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: [{ type: 'severity_equals', value: severity }],
      })
    ).not.toThrow();
  });

  test('rejects severity_equals with an unknown severity value', () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: [{ type: 'severity_equals', value: 'catastrophic' }],
      })
    ).toThrow();
  });

  test('rejects severity_equals without a value', () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: [{ type: 'severity_equals' }],
      })
    ).toThrow();
  });

  test('rejects a condition with an unknown type', () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: [{ type: 'unknown_type' }],
      })
    ).toThrow();
  });

  test('accepts condition_operator "all"', () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: [{ type: 'severity_change' }],
        condition_operator: 'all',
      })
    ).not.toThrow();
  });

  test('rejects an unknown condition_operator', () => {
    expect(() =>
      snoozeAlertBodySchema.validate({
        conditions: [{ type: 'severity_change' }],
        condition_operator: 'none',
      })
    ).toThrow();
  });

  test('rejects a body with neither expires_at nor conditions', () => {
    expect(() => snoozeAlertBodySchema.validate({})).toThrow(
      'either [expires_at] or [conditions] must be provided'
    );
  });

  test('rejects an empty conditions array', () => {
    expect(() => snoozeAlertBodySchema.validate({ conditions: [] })).toThrow(
      '[conditions] must contain at least one condition'
    );
  });

  test('rejects an expires_at in the past', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    expect(() => snoozeAlertBodySchema.validate({ expires_at: pastDate })).toThrow(
      '[expires_at] must be in the future'
    );
  });

  test('rejects a non-ISO expires_at', () => {
    expect(() => snoozeAlertBodySchema.validate({ expires_at: 'not-a-date' })).toThrow();
  });
});
