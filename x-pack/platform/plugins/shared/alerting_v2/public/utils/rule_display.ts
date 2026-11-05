/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDuration } from '@kbn/alerting-plugin/common';
import type {
  NoDataStrategy,
  Recovery,
  RecoveryStrategy,
  RuleAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { recoveryStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';

export const EMPTY_VALUE = '-';

const IMMEDIATE_LABEL = i18n.translate('xpack.alertingV2.ruleDetails.immediateValue', {
  defaultMessage: 'Immediate',
});

const AND_OPERATOR_LABEL = i18n.translate('xpack.alertingV2.ruleDetails.delayConnectorAnd', {
  defaultMessage: 'and',
});

const OR_OPERATOR_LABEL = i18n.translate('xpack.alertingV2.ruleDetails.delayConnectorOr', {
  defaultMessage: 'or',
});

const QUERY_OVERFLOW_MAX_VISIBLE_LINES = 5;
const QUERY_OVERFLOW_HEIGHT = 240;

/**
 * Builds a human-readable delay string from a count, timeframe, and operator.
 *
 * `count` is the number of evaluations spent in the phase (as stored), which
 * resolves on the evaluation after that — so the displayed match/recovery
 * number is `count + 1`.
 *
 * Possible outputs (for a stored count of 3):
 *  - count only:     "After 4 matches"
 *  - timeframe only: "After 5 min"
 *  - both (or):      "After 4 matches or 5 min"
 *  - both (and):     "After 4 matches and 5 min"
 */
const formatDelay = ({
  count,
  countLabel,
  timeframe,
  operator,
}: {
  count?: number;
  countLabel: (n: number) => string;
  timeframe?: string;
  operator?: string;
}): string => {
  const hasCount = count != null && count > 0;
  const hasTimeframe = timeframe != null;

  if (hasCount && hasTimeframe) {
    const connector = operator === 'and' ? AND_OPERATOR_LABEL : OR_OPERATOR_LABEL;

    return i18n.translate('xpack.alertingV2.ruleDetails.delayCountAndTimeframe', {
      defaultMessage: 'After {countPart} {connector} {timeframePart}',
      values: {
        countPart: countLabel(count + 1),
        connector,
        timeframePart: formatDuration(timeframe),
      },
    });
  }

  if (hasCount) {
    return i18n.translate('xpack.alertingV2.ruleDetails.delayCountOnly', {
      defaultMessage: 'After {countPart}',
      values: { countPart: countLabel(count + 1) },
    });
  }

  if (hasTimeframe) {
    return i18n.translate('xpack.alertingV2.ruleDetails.delayTimeframeOnly', {
      defaultMessage: 'After {timeframePart}',
      values: { timeframePart: formatDuration(timeframe) },
    });
  }

  return EMPTY_VALUE;
};

const matchLabel = (n: number) =>
  i18n.translate('xpack.alertingV2.ruleDetails.matchCount', {
    defaultMessage: '{n} {n, plural, one {match} other {matches}}',
    values: { n },
  });

const recoveryLabel = (n: number) =>
  i18n.translate('xpack.alertingV2.ruleDetails.recoveryCount', {
    defaultMessage: '{n} {n, plural, one {recovery} other {recoveries}}',
    values: { n },
  });

/**
 * A count of 0 resolves the phase on the first evaluation, unless a timeframe is ANDed
 * with it, in which case the timeframe still has to elapse (see `isPhaseSkipped` on the
 * server for the schedule-interval caveat this is subject to).
 */
const isImmediateDelay = ({
  count,
  timeframe,
  operator,
}: {
  count?: number;
  timeframe?: string;
  operator?: string;
}): boolean => count === 0 && !(timeframe != null && operator === 'and');

export function formatAlertDelay(stateTransition: RuleAttachmentData['state_transition']): string {
  const pending = stateTransition?.pending;

  if (pending?.count == null && pending?.timeframe == null) {
    return EMPTY_VALUE;
  }

  if (isImmediateDelay(pending)) {
    return IMMEDIATE_LABEL;
  }

  return formatDelay({
    count: pending.count,
    countLabel: matchLabel,
    timeframe: pending.timeframe,
    operator: pending.operator,
  });
}

export function formatRecoveryDelay(
  stateTransition: RuleAttachmentData['state_transition']
): string {
  const recovering = stateTransition?.recovering;

  if (recovering?.count == null && recovering?.timeframe == null) {
    return EMPTY_VALUE;
  }

  if (isImmediateDelay(recovering)) {
    return IMMEDIATE_LABEL;
  }

  return formatDelay({
    count: recovering.count,
    countLabel: recoveryLabel,
    timeframe: recovering.timeframe,
    operator: recovering.operator,
  });
}

const NO_DATA_STRATEGY_LABELS: Record<NoDataStrategy, string> = {
  ignore: i18n.translate('xpack.alertingV2.ruleDetails.noDataStrategy.ignore', {
    defaultMessage: 'Do nothing',
  }),
  keep_last: i18n.translate('xpack.alertingV2.ruleDetails.noDataStrategy.keepLast', {
    defaultMessage: 'Keep last known status',
  }),
  resolve: i18n.translate('xpack.alertingV2.ruleDetails.noDataStrategy.resolve', {
    defaultMessage: 'Recover immediately',
  }),
  alert: i18n.translate('xpack.alertingV2.ruleDetails.noDataStrategy.alert', {
    defaultMessage: 'Alert on no data',
  }),
};

export function formatNoDataStrategy(strategy?: NoDataStrategy | null): string {
  if (!strategy) return EMPTY_VALUE;
  return NO_DATA_STRATEGY_LABELS[strategy] ?? EMPTY_VALUE;
}

/**
 * The ES|QL the user authored for recovery: a bare segment for `condition`, the
 * whole query for `query`, and nothing for the strategies that never run one.
 */
export function getRecoverEsqlSegment(recovery?: Recovery | null): string | undefined {
  if (recovery?.strategy === recoveryStrategy.condition) return recovery.segment;
  if (recovery?.strategy === recoveryStrategy.query) return recovery.query;
  return undefined;
}

export function getQueryOverflowHeight(query: string): number | undefined {
  if (!query.trim()) {
    return undefined;
  }

  return query.split('\n').length > QUERY_OVERFLOW_MAX_VISIBLE_LINES
    ? QUERY_OVERFLOW_HEIGHT
    : undefined;
}

const RECOVERY_STRATEGY_LABELS: Record<RecoveryStrategy, string> = {
  no_breach: i18n.translate('xpack.alertingV2.ruleDetails.recoveryDefault', {
    defaultMessage: 'Default',
  }),
  condition: i18n.translate('xpack.alertingV2.ruleDetails.recoveryStrategy.condition', {
    defaultMessage: 'Custom condition',
  }),
  query: i18n.translate('xpack.alertingV2.ruleDetails.recoveryCustom', {
    defaultMessage: 'Custom',
  }),
  manual: i18n.translate('xpack.alertingV2.ruleDetails.recoveryStrategy.manual', {
    defaultMessage: 'Manual only',
  }),
};

export function formatRecoveryStrategy(strategy?: RecoveryStrategy | null): string {
  if (strategy == null) return EMPTY_VALUE;
  return RECOVERY_STRATEGY_LABELS[strategy];
}
