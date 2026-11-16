/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  DestinationFailedView,
  FailureClassView,
  FailureRateView,
} from '../../services/unit_stats_client/types';

/** The time that the failures cover: a fixed number of minutes, or the range of the time picker. */
export type FailurePeriod = { kind: 'lastMinutes'; minutes: number } | { kind: 'timePicker' };

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

/** The failure classes of a destination that have failures, with the name that each one shows. */
export const getFailureClasses = (
  failed: DestinationFailedView
): Array<{
  key: 'Authentication' | 'Authorization';
  title: string;
  failureClass: FailureClassView;
}> =>
  [
    {
      key: 'Authentication' as const,
      title: i18n.translate('xpack.streams.unitStats.failures.authentication', {
        defaultMessage: 'Authentication',
      }),
      failureClass: failed.authentication,
    },
    {
      key: 'Authorization' as const,
      title: i18n.translate('xpack.streams.unitStats.failures.authorization', {
        defaultMessage: 'Authorization',
      }),
      failureClass: failed.authorization,
    },
  ].filter(({ failureClass }) => hasFailures(failureClass));
