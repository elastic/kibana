/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionPolicyResponseSchema } from '@kbn/alerting-v2-schemas';
import type { ActionPolicySavedObjectAttributes } from '../../saved_objects';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { transformActionPolicySoAttributesToApiResponse, validateDateString } from './utils';

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

describe('transformActionPolicySoAttributesToApiResponse', () => {
  const attributes: ActionPolicySavedObjectAttributes = {
    name: 'policy',
    description: 'policy description',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'wf-1' }],
    matcher: { expression: 'event.severity: critical' },
    groupBy: ['host.name'],
    tags: null,
    groupingMode: 'per_episode',
    throttle: null,
    snoozedUntil: null,
    apiKey: 'api-key',
    apiKeyOwner: 'elastic',
    apiKeyCreatedByUser: false,
    createdBy: { profile_uid: 'user-1' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedBy: { profile_uid: 'user-1' },
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const transformThrottle = (throttle: ActionPolicySavedObjectAttributes['throttle']) =>
    actionPolicyResponseSchema.parse(
      transformActionPolicySoAttributesToApiResponse({
        id: 'policy-1',
        attributes: { ...attributes, throttle },
      })
    ).throttle;

  it('emits a null strategy for a stored throttle that has none', () => {
    expect(transformThrottle({ interval: '1h' })).toEqual({ strategy: null, interval: '1h' });
  });

  it('emits a null strategy and interval for an empty stored throttle', () => {
    expect(transformThrottle({})).toEqual({ strategy: null, interval: null });
  });

  it('keeps a stored strategy and interval', () => {
    expect(transformThrottle({ strategy: 'per_status_interval', interval: '5m' })).toEqual({
      strategy: 'per_status_interval',
      interval: '5m',
    });
  });

  it('nulls the interval of an intervalless stored strategy', () => {
    expect(transformThrottle({ strategy: 'on_status_change', interval: '5m' })).toEqual({
      strategy: 'on_status_change',
      interval: null,
    });
  });

  it('emits null for a missing throttle', () => {
    expect(transformThrottle(null)).toBeNull();
    expect(transformThrottle(undefined)).toBeNull();
  });
});
