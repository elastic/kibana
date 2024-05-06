/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Comparator } from '../../../../common/custom_threshold_rule/types';
import { formatDurationFromTimeUnitChar } from '../../../../common';
import { Evaluation } from './lib/evaluate_rule';
import { formatAlertResult, FormattedEvaluation } from './lib/format_alert_result';
import {
  BELOW_TEXT,
  ABOVE_TEXT,
  BETWEEN_TEXT,
  NOT_BETWEEN_TEXT,
  CUSTOM_EQUATION_I18N,
  ABOVE_OR_EQ_TEXT,
  BELOW_OR_EQ_TEXT,
} from './translations';
import { UNGROUPED_FACTORY_KEY } from './constants';

const toNumber = (value: number | string) =>
  typeof value === 'string' ? parseFloat(value) : value;

const recoveredComparatorToI18n = (
  comparator: Comparator,
  threshold: number[],
  currentValue: number
) => {
  switch (comparator) {
    case Comparator.BETWEEN:
      return currentValue < threshold[0] ? BELOW_TEXT : ABOVE_TEXT;
    case Comparator.OUTSIDE_RANGE:
      return BETWEEN_TEXT;
    case Comparator.GT:
      return ABOVE_TEXT;
    case Comparator.GT_OR_EQ:
      return ABOVE_OR_EQ_TEXT;
    case Comparator.LT:
      return BELOW_TEXT;
    case Comparator.LT_OR_EQ:
      return BELOW_OR_EQ_TEXT;
  }
};

const alertComparatorToI18n = (comparator: Comparator) => {
  switch (comparator) {
    case Comparator.BETWEEN:
      return BETWEEN_TEXT;
    case Comparator.OUTSIDE_RANGE:
      return NOT_BETWEEN_TEXT;
    case Comparator.GT:
      return ABOVE_TEXT;
    case Comparator.GT_OR_EQ:
      return ABOVE_OR_EQ_TEXT;
    case Comparator.LT:
      return BELOW_TEXT;
    case Comparator.LT_OR_EQ:
      return BELOW_OR_EQ_TEXT;
  }
};

const thresholdToI18n = ([a, b]: Array<number | string>) => {
  if (typeof b === 'undefined') return a;
  return i18n.translate('xpack.observability.customThreshold.rule.threshold.thresholdRange', {
    defaultMessage: '{a} and {b}',
    values: { a, b },
  });
};

const formatGroup = (group: string) => (group === UNGROUPED_FACTORY_KEY ? '' : ` for ${group}`);

export const buildFiredAlertReason: (
  alertResults: Array<Record<string, Evaluation>>,
  group: string,
  dataView: string
) => string = (alertResults, group, dataView) => {
  const aggregationReason =
    alertResults
      .map((result: any) => buildAggregationReason(formatAlertResult(result[group])))
      .join('; ') + '.';
  const sharedReason =
    '(' +
    [
      i18n.translate('xpack.observability.customThreshold.rule.reason.forTheLast', {
        defaultMessage: 'duration: {duration}',
        values: {
          duration: formatDurationFromTimeUnitChar(
            alertResults[0][group].timeSize,
            alertResults[0][group].timeUnit
          ),
        },
      }),
      i18n.translate('xpack.observability.customThreshold.rule.reason.dataView', {
        defaultMessage: 'data view: {dataView}',
        values: {
          dataView,
        },
      }),
      group !== UNGROUPED_FACTORY_KEY
        ? i18n.translate('xpack.observability.customThreshold.rule.reason.group', {
            defaultMessage: 'group: {group}',
            values: {
              group,
            },
          })
        : null,
    ]
      .filter((item) => !!item)
      .join(', ') +
    ')';
  return aggregationReason + ' ' + sharedReason;
};

const buildAggregationReason: (evaluation: FormattedEvaluation) => string = ({
  label,
  comparator,
  threshold,
  currentValue,
}) =>
  i18n.translate('xpack.observability.customThreshold.rule.threshold.firedAlertReason', {
    defaultMessage: '{label} is {currentValue}, {comparator} the threshold of {threshold}',
    values: {
      label,
      comparator: alertComparatorToI18n(comparator),
      threshold: thresholdToI18n(threshold),
      currentValue,
    },
  });

// Once recovered reason messages are re-enabled, checkout this issue https://github.com/elastic/kibana/issues/121272 regarding latest reason format
export const buildRecoveredAlertReason: (alertResult: {
  group: string;
  label?: string;
  comparator: Comparator;
  threshold: Array<number | string>;
  currentValue: number | string;
}) => string = ({ group, label = CUSTOM_EQUATION_I18N, comparator, threshold, currentValue }) =>
  i18n.translate('xpack.observability.customThreshold.rule.threshold.recoveredAlertReason', {
    defaultMessage:
      '{label} is now {comparator} a threshold of {threshold} (current value is {currentValue}) for {group}',
    values: {
      label,
      comparator: recoveredComparatorToI18n(
        comparator,
        threshold.map(toNumber),
        toNumber(currentValue)
      ),
      threshold: thresholdToI18n(threshold),
      currentValue,
      group,
    },
  });

export const buildNoDataAlertReason: (alertResult: Evaluation & { group: string }) => string = ({
  group,
  label = CUSTOM_EQUATION_I18N,
  timeSize,
  timeUnit,
}) =>
  i18n.translate('xpack.observability.customThreshold.rule.threshold.noDataAlertReason', {
    defaultMessage: '{label} reported no data in the last {interval}{group}',
    values: {
      label,
      interval: `${timeSize}${timeUnit}`,
      group: formatGroup(group),
    },
  });

export const buildErrorAlertReason = (metric: string) =>
  i18n.translate('xpack.observability.customThreshold.rule.threshold.errorAlertReason', {
    defaultMessage: 'Elasticsearch failed when attempting to query data for {metric}',
    values: {
      metric,
    },
  });
