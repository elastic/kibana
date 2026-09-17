/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDuration } from '@kbn/alerting-plugin/common';
import type { NoDataStrategy, Recovery, RecoveryStrategy } from '@kbn/alerting-v2-schemas';
import { recoveryStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../services/rules_api';

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

/**
 * Builds a human-readable delay string from a count, timeframe, and operator.
 *
 * Possible outputs:
 *  - count only:     "After 3 matches"
 *  - timeframe only: "After 5 min"
 *  - both (OR):      "After 3 matches or 5 min"
 *  - both (AND):     "After 3 matches and 5 min"
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
    const connector = operator === 'AND' ? AND_OPERATOR_LABEL : OR_OPERATOR_LABEL;

    return i18n.translate('xpack.alertingV2.ruleDetails.delayCountAndTimeframe', {
      defaultMessage: 'After {countPart} {connector} {timeframePart}',
      values: {
        countPart: countLabel(count),
        connector,
        timeframePart: formatDuration(timeframe),
      },
    });
  }

  if (hasCount) {
    return i18n.translate('xpack.alertingV2.ruleDetails.delayCountOnly', {
      defaultMessage: 'After {countPart}',
      values: { countPart: countLabel(count) },
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

export function formatAlertDelay(stateTransition: RuleApiResponse['state_transition']): string {
  const pending = stateTransition?.pending;

  if (pending?.count == null && pending?.timeframe == null) {
    return EMPTY_VALUE;
  }

  if (pending.count === 0 && pending.timeframe == null) {
    return IMMEDIATE_LABEL;
  }

  return formatDelay({
    count: pending.count,
    countLabel: matchLabel,
    timeframe: pending.timeframe,
    operator: pending.operator,
  });
}

export function formatRecoveryDelay(stateTransition: RuleApiResponse['state_transition']): string {
  const recovering = stateTransition?.recovering;

  if (recovering?.count == null && recovering?.timeframe == null) {
    return EMPTY_VALUE;
  }

  if (recovering.count === 0 && recovering.timeframe == null) {
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
