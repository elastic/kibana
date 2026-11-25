/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { formatFailureBasis } from '../../../services/unit_stats_client/format_stats';
import type {
  DestinationFailedView,
  FailureClassView,
  FailureRateView,
} from '../../../services/unit_stats_client/types';

/**
 * A class has failures when its percentage is above 0. With no percentage, which happens when
 * nothing is known to be a share of, a rate above 0 still counts. A `null` and a `0` do not.
 */
export const hasFailures = ({ percentage, rate }: FailureRateView): boolean =>
  percentage !== null ? percentage > 0 : (rate ?? 0) > 0;

/** Whether either failure class of a destination has failures to show. */
export const hasDestinationFailures = ({
  authentication,
  authorization,
}: DestinationFailedView): boolean => hasFailures(authentication) || hasFailures(authorization);

/**
 * What the figures are a share of: `events`, or `upload attempts`. A destination reports in one
 * unit, so the first class with failures names it, and a destination with none names the unit of its
 * authentication class.
 */
const getFailureBasis = (failed: DestinationFailedView): string => {
  const { unit } =
    hasFailures(failed.authorization) && !hasFailures(failed.authentication)
      ? failed.authorization
      : failed.authentication;

  return formatFailureBasis(unit);
};

/**
 * What the figures of the Map are a share of, and for how long, said once: `Of events in the last
 * 15 minutes`. The stats then carry no noun in their units.
 */
export const getFailureSubtitle = (failed: DestinationFailedView, minutes: number): string =>
  i18n.translate('xpack.streams.unitStats.failures.subtitleLastMinutes', {
    defaultMessage: 'Of {basis} in the last {minutes, plural, one {minute} other {# minutes}}',
    values: { basis: getFailureBasis(failed), minutes },
  });

/**
 * The same for the flyout, which covers the range of the time picker: `Of events for the selected
 * time range`.
 */
export const getFailureRangeSubtitle = (failed: DestinationFailedView): string =>
  i18n.translate('xpack.streams.unitStats.failures.subtitleSelectedRange', {
    defaultMessage: 'Of {basis} for the selected time range',
    values: { basis: getFailureBasis(failed) },
  });

/** The failure classes of a destination that have failures, with the name that each one shows. */
export const getFailureClasses = (
  failed: DestinationFailedView
): Array<{
  /** The name of the class in the fields of the failures, for example of a series. */
  id: 'authentication' | 'authorization';
  /** The same, for a test id. */
  key: 'Authentication' | 'Authorization';
  title: string;
  failureClass: FailureClassView;
}> =>
  [
    {
      id: 'authentication' as const,
      key: 'Authentication' as const,
      title: i18n.translate('xpack.streams.unitStats.failures.authentication', {
        defaultMessage: 'Authentication',
      }),
      failureClass: failed.authentication,
    },
    {
      id: 'authorization' as const,
      key: 'Authorization' as const,
      title: i18n.translate('xpack.streams.unitStats.failures.authorization', {
        defaultMessage: 'Authorization',
      }),
      failureClass: failed.authorization,
    },
  ].filter(({ failureClass }) => hasFailures(failureClass));
