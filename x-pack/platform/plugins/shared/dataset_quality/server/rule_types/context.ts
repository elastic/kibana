/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATA_QUALITY_DETAILS_LOCATOR_ID,
  DATA_QUALITY_LOCATOR_ID,
} from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { getHumanReadableComparator } from '@kbn/stack-alerts-plugin/common';
import type { Comparator } from '@kbn/stack-alerts-plugin/common/comparator_types';
import { LocatorClient } from '@kbn/share-plugin/common/url_service';
import moment from 'moment';
import { TimeRangeConfig } from '../../common/types';
import { AdditionalContext, DatasetQualityRuleParams } from './types';

export const getPaddedAlertTimeRange = (
  alertStart: string,
  alertEnd?: string,
  lookBackWindow?: {
    size: number;
    unit: 's' | 'm' | 'h' | 'd';
  }
): TimeRangeConfig => {
  const alertDuration = moment.duration(moment(alertEnd).diff(moment(alertStart)));
  const now = moment().toISOString();

  // If alert duration is less than 160 min, we use 20 minute buffer
  // Otherwise, we use 8 times alert duration
  const defaultDurationMs =
    alertDuration.asMinutes() < 160
      ? moment.duration(20, 'minutes').asMilliseconds()
      : alertDuration.asMilliseconds() / 8;
  // To ensure the alert time range at least covers 20 times lookback window,
  // we compare lookBackDurationMs and defaultDurationMs to use any of those that is longer
  const lookBackDurationMs =
    lookBackWindow &&
    moment.duration(lookBackWindow.size * 20, lookBackWindow.unit).asMilliseconds();
  const durationMs =
    lookBackDurationMs && lookBackDurationMs - defaultDurationMs > 0
      ? lookBackDurationMs
      : defaultDurationMs;

  const from = moment(alertStart).subtract(durationMs, 'millisecond').toISOString();
  const to =
    alertEnd && moment(alertEnd).add(durationMs, 'millisecond').isBefore(now)
      ? moment(alertEnd).add(durationMs, 'millisecond').toISOString()
      : now;

  return {
    from,
    to,
    refresh: {
      pause: true,
      value: 60000,
    },
  };
};

const getDataQualityViewInAppUrl = ({
  index,
  from,
  to,
  locatorsClient,
}: {
  index: string;
  from: string;
  to: string;
  locatorsClient?: LocatorClient;
}) => {
  const timeRange: TimeRangeConfig | undefined = getPaddedAlertTimeRange(from, to);
  timeRange.to = to ? timeRange.to : 'now';

  // If index is a wildcard or multiple indices, redirect to the data quality overview page
  if (index.includes('*') || index.includes(',')) {
    return locatorsClient?.get(DATA_QUALITY_LOCATOR_ID)?.getRedirectUrl({
      timeRange: {
        from,
        to,
        refresh: {
          pause: true,
          value: 60000,
        },
      },
    });
  }

  return locatorsClient?.get(DATA_QUALITY_DETAILS_LOCATOR_ID)?.getRedirectUrl({
    dataStream: index,
    timeRange: {
      from,
      to,
      refresh: {
        pause: true,
        value: 60000,
      },
    },
  });
};

const generateReason = (
  value: string,
  group: string,
  timeSize: number,
  timeUnit: string,
  comparator: Comparator,
  threshold: number[]
) =>
  i18n.translate('xpack.datasetQuality.rule.alertTypeContextReasonDescription', {
    defaultMessage: `Percentage of degraded documents is {value}% in the last {window} for {group}. Alert when {comparator} {threshold}%.`,
    values: {
      value,
      window: `${timeSize}${timeUnit}`,
      group,
      comparator: getHumanReadableComparator(comparator),
      threshold: threshold.join(' and '),
    },
  });

export const generateContext = ({
  group,
  dateStart,
  dateEnd,
  value,
  params,
  grouping,
  locatorsClient,
}: {
  group: string;
  dateStart: string;
  dateEnd: string;
  value: string;
  params: DatasetQualityRuleParams;
  grouping?: AdditionalContext;
  locatorsClient?: LocatorClient;
}) => ({
  value,
  reason: generateReason(
    value,
    group,
    params.timeSize,
    params.timeUnit,
    params.comparator as Comparator,
    params.threshold
  ),
  grouping,
  timestamp: dateEnd,
  viewInAppUrl: getDataQualityViewInAppUrl({
    index: params.searchConfiguration.index,
    from: dateStart,
    to: dateEnd,
    locatorsClient,
  }),
});
