/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_DESTINATION_FAILED } from '../../../services/unit_stats_client/map_stats_response';
import type {
  DestinationFailedView,
  FailureClassView,
  FailureRateView,
} from '../../../services/unit_stats_client/types';
import {
  getFailureClasses,
  getFailureRangeSubtitle,
  getFailureSubtitle,
  hasDestinationFailures,
  hasFailures,
} from './destination_failures';

const rateView = (rate: number | null, percentage: number | null): FailureRateView => ({
  rate,
  unit: '{item}',
  percentage,
});

const failureClass = (
  rate: number | null,
  percentage: number | null,
  unit = '{item}'
): FailureClassView => ({ rate, unit, percentage, breakdown: [] });

const failed = (overrides: Partial<DestinationFailedView>): DestinationFailedView => ({
  ...EMPTY_DESTINATION_FAILED,
  ...overrides,
});

describe('hasFailures', () => {
  it.each<[string, number | null, number | null, boolean]>([
    ['no data', null, null, false],
    ['a percentage and a rate of 0', 0, 0, false],
    ['a percentage above 0', 0.5, 11.9, true],
    [
      'a rate above 0 and no percentage, because nothing is known to be a share of',
      0.5,
      null,
      true,
    ],
    ['a rate of 0 and no percentage', 0, null, false],
    ['a percentage of 0, whatever the rate', 0.5, 0, false],
  ])('%s', (_description, rate, percentage, expected) => {
    expect(hasFailures(rateView(rate, percentage))).toBe(expected);
  });
});

describe('hasDestinationFailures', () => {
  it('is false when neither class has failures', () => {
    expect(hasDestinationFailures(failed({}))).toBe(false);
  });

  it.each(['authentication', 'authorization'] as const)('is true when only %s has them', (key) => {
    expect(hasDestinationFailures(failed({ [key]: failureClass(0.5, 11.9) }))).toBe(true);
  });
});

describe('getFailureClasses', () => {
  it('lists only the classes that have failures, in a fixed order, with their names', () => {
    const authentication = failureClass(0.5, 11.9);
    const authorization = failureClass(1.9, 45.2);

    expect(getFailureClasses(failed({ authentication, authorization }))).toEqual([
      {
        id: 'authentication',
        key: 'Authentication',
        title: 'Authentication',
        failureClass: authentication,
      },
      {
        id: 'authorization',
        key: 'Authorization',
        title: 'Authorization',
        failureClass: authorization,
      },
    ]);
    expect(getFailureClasses(failed({ authorization })).map(({ key }) => key)).toEqual([
      'Authorization',
    ]);
    expect(getFailureClasses(failed({}))).toEqual([]);
  });
});

describe('getFailureSubtitle and getFailureRangeSubtitle', () => {
  it('name events for a destination that counts items', () => {
    const items = failed({ authentication: failureClass(0.5, 11.9) });

    expect(getFailureSubtitle(items, 15)).toBe('Of events in the last 15 minutes');
    expect(getFailureRangeSubtitle(items)).toBe('Of events for the selected time range');
  });

  it('name upload attempts for a destination that counts requests', () => {
    const requests = failed({ authentication: failureClass(0.44, 100, '{request}') });

    expect(getFailureSubtitle(requests, 15)).toBe('Of upload attempts in the last 15 minutes');
    expect(getFailureRangeSubtitle(requests)).toBe(
      'Of upload attempts for the selected time range'
    );
  });

  it('say minute, not 1 minutes', () => {
    expect(getFailureSubtitle(failed({ authentication: failureClass(0.5, 11.9) }), 1)).toBe(
      'Of events in the last minute'
    );
  });

  it('take the unit from the class that has failures, not from one that has none', () => {
    const onlyAuthorization = failed({
      authentication: failureClass(null, null, '{item}'),
      authorization: failureClass(0.44, 100, '{request}'),
    });

    expect(getFailureRangeSubtitle(onlyAuthorization)).toBe(
      'Of upload attempts for the selected time range'
    );
  });
});
