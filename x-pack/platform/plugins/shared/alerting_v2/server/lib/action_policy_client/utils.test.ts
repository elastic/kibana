/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionPolicyResponseSchema } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import type { ActionPolicySavedObjectAttributes } from '../../saved_objects';
import {
  buildCreateActionPolicyAttributes,
  buildUpdateActionPolicyAttributes,
  toPatchableActionPolicyData,
  transformActionPolicySoAttributesToApiResponse,
  validateDateString,
} from './utils';

describe('validateDateString', () => {
  it('does not throw for a valid ISO 8601 datetime', () => {
    expect(() => validateDateString('2025-06-01T12:00:00.000Z')).not.toThrow();
  });

  it('throws Boom.badRequest with INVALID_DATE_STRING and the offending value as details', () => {
    let caught: unknown;
    try {
      validateDateString('not-a-date');
    } catch (e) {
      caught = e;
    }

    expect(caught).toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      data: {
        code: ALERTING_ERROR_CODES.INVALID_DATE_STRING,
        details: { value: 'not-a-date' },
      },
    });
  });

  it('throws for a date-only string with no time component', () => {
    let caught: unknown;
    try {
      validateDateString('2025-06-01');
    } catch (e) {
      caught = e;
    }

    expect(caught).toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      data: {
        code: ALERTING_ERROR_CODES.INVALID_DATE_STRING,
        details: { value: '2025-06-01' },
      },
    });
  });

  it('throws for an empty string', () => {
    let caught: unknown;
    try {
      validateDateString('');
    } catch (e) {
      caught = e;
    }

    expect(caught).toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      data: {
        code: ALERTING_ERROR_CODES.INVALID_DATE_STRING,
        details: { value: '' },
      },
    });
  });
});

const storedAttributes = (
  overrides: Partial<ActionPolicySavedObjectAttributes> = {}
): ActionPolicySavedObjectAttributes => ({
  name: 'policy',
  description: 'desc',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'wf-1' }],
  apiKey: 'key',
  apiKeyOwner: 'elastic',
  apiKeyCreatedByUser: false,
  createdBy: null,
  createdAt: '2026-10-07T00:00:00.000Z',
  updatedBy: null,
  updatedAt: '2026-10-07T00:00:00.000Z',
  ...overrides,
});

/**
 * Documents written before the API rejected empty sentinels must still satisfy the response schema,
 * whose optional fields are now either absent or non-empty.
 */
describe('reading legacy empty sentinels', () => {
  const read = (overrides: Partial<ActionPolicySavedObjectAttributes>) =>
    transformActionPolicySoAttributesToApiResponse({
      id: 'policy-1',
      attributes: storedAttributes(overrides),
    });

  it('projects an empty description as absent', () => {
    const result = read({ description: '' });
    expect(result.description).toBeUndefined();
    expect(() => actionPolicyResponseSchema.parse(result)).not.toThrow();
  });

  it('projects an absent grouping as absent, which reads as per_alert', () => {
    const result = read({ grouping: undefined });
    expect(result.grouping).toBeUndefined();
    expect(() => actionPolicyResponseSchema.parse(result)).not.toThrow();
  });

  it('projects a throttle without a strategy as absent', () => {
    const result = read({ throttle: { interval: '5m' } });
    expect(result.throttle).toBeUndefined();
    expect(() => actionPolicyResponseSchema.parse(result)).not.toThrow();
  });

  it('drops an interval the strategy cannot use', () => {
    const result = read({ throttle: { strategy: 'on_status_change', interval: '5m' } });
    expect(result.throttle).toStrictEqual({ strategy: 'on_status_change' });
  });

  it('projects a scheduled strategy with no interval as absent', () => {
    const result = read({ throttle: { strategy: 'time_interval' } });
    expect(result.throttle).toBeUndefined();
    expect(() => actionPolicyResponseSchema.parse(result)).not.toThrow();
  });

  it.each([{}, { tags: [] }, { expression: '' }, { tags: [], expression: '' }])(
    'projects a matcher that constrains nothing as absent: %p',
    (matcher) => {
      const result = read({ matcher });
      expect(result.matcher).toBeUndefined();
      expect(() => actionPolicyResponseSchema.parse(result)).not.toThrow();
    }
  );

  it('keeps the leaf a legacy matcher does constrain', () => {
    const result = read({ matcher: { tags: [], expression: 'severity: 1' } });
    expect(result.matcher).toStrictEqual({ expression: 'severity: 1' });
  });

  it('offers the same normalised view to a patch merge', () => {
    const patchable = toPatchableActionPolicyData(
      storedAttributes({
        description: '',
        throttle: { interval: '5m' },
        matcher: {},
      })
    );

    expect(patchable.description).toBeUndefined();
    expect(patchable.throttle).toBeUndefined();
    expect(patchable.matcher).toBeUndefined();
  });
});

describe('grouping round trips between storage and the API', () => {
  const groupings: Array<[string, ActionPolicySavedObjectAttributes['grouping']]> = [
    ['per_alert', { mode: 'per_alert' }],
    ['all', { mode: 'all' }],
    ['per_field', { mode: 'per_field', fields: ['host.name', 'service.name'] }],
  ];

  it.each(groupings)('reads a stored %s grouping unchanged', (_label, grouping) => {
    const result = transformActionPolicySoAttributesToApiResponse({
      id: 'policy-1',
      attributes: storedAttributes({ grouping }),
    });

    expect(result.grouping).toStrictEqual(grouping);
    expect(() => actionPolicyResponseSchema.parse(result)).not.toThrow();
  });

  it.each(groupings)(
    'offers a stored %s grouping to a patch merge unchanged',
    (_label, grouping) => {
      expect(toPatchableActionPolicyData(storedAttributes({ grouping })).grouping).toStrictEqual(
        grouping
      );
    }
  );
});

describe('writing optional fields', () => {
  const auth = { apiKey: 'key', owner: 'elastic', createdByUser: false };
  const data = {
    name: 'policy',
    destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
  };

  it('stores no description when it is omitted', () => {
    const attrs = buildCreateActionPolicyAttributes({
      data,
      auth,
      createdBy: null,
      createdAt: '2026-10-07T00:00:00.000Z',
      updatedBy: null,
      updatedAt: '2026-10-07T00:00:00.000Z',
    });

    expect(attrs.description).toBeUndefined();
  });

  it('stores no description once it is cleared on update', () => {
    const attrs = buildUpdateActionPolicyAttributes({
      existing: storedAttributes(),
      data,
      auth,
      updatedBy: null,
      updatedAt: '2026-10-07T00:00:01.000Z',
    });

    expect(attrs.description).toBeUndefined();
  });

  it('stores no matcher when the one it is given constrains nothing', () => {
    const attrs = buildUpdateActionPolicyAttributes({
      existing: storedAttributes({ matcher: { tags: ['prod'] } }),
      data: { ...data, matcher: {} },
      auth,
      updatedBy: null,
      updatedAt: '2026-10-07T00:00:01.000Z',
    });

    expect(attrs.matcher).toBeUndefined();
  });
});
