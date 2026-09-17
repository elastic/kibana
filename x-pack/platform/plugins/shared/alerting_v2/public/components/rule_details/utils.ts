/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDuration } from '@kbn/alerting-plugin/common';
import type { NoDataStrategy } from '@kbn/alerting-v2-schemas';
import { recoveryStrategy, type Query, type RecoveryStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../services/rules_api';

export const EMPTY_VALUE = '-';

/**
 * The evaluation that first matches already counts towards the threshold, so counts at or
 * below this resolve on that evaluation and are shown as immediate rather than as a delay.
 */
const IMMEDIATE_COUNT = 1;

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
  const {
    pending_count: count,
    pending_timeframe: timeframe,
    pending_operator: operator,
  } = stateTransition ?? {};

  if (count == null && timeframe == null) {
    return EMPTY_VALUE;
  }

  if (count != null && count <= IMMEDIATE_COUNT && timeframe == null) {
    return IMMEDIATE_LABEL;
  }

  return formatDelay({ count, countLabel: matchLabel, timeframe, operator });
}

export function formatRecoveryDelay(stateTransition: RuleApiResponse['state_transition']): string {
  const {
    recovering_count: count,
    recovering_timeframe: timeframe,
    recovering_operator: operator,
  } = stateTransition ?? {};

  if (count == null && timeframe == null) {
    return EMPTY_VALUE;
  }

  if (count != null && count <= IMMEDIATE_COUNT && timeframe == null) {
    return IMMEDIATE_LABEL;
  }

  return formatDelay({ count, countLabel: recoveryLabel, timeframe, operator });
}

const NO_DATA_STRATEGY_LABELS: Record<NoDataStrategy, string> = {
  last_known_status: i18n.translate('xpack.alertingV2.ruleDetails.noDataStrategy.lastKnownStatus', {
    defaultMessage: 'Keep last known status',
  }),
  emit: i18n.translate('xpack.alertingV2.ruleDetails.noDataStrategy.emit', {
    defaultMessage: 'Use no data status',
  }),
  recover: i18n.translate('xpack.alertingV2.ruleDetails.noDataStrategy.recover', {
    defaultMessage: 'Recover immediately',
  }),
  none: i18n.translate('xpack.alertingV2.ruleDetails.noDataStrategy.none', {
    defaultMessage: 'Do nothing',
  }),
};

export function formatNoDataStrategy(strategy?: NoDataStrategy | null): string {
  if (!strategy) return EMPTY_VALUE;
  return NO_DATA_STRATEGY_LABELS[strategy] ?? EMPTY_VALUE;
}

export function getRecoverEsqlSegment(
  query: Query,
  strategy?: RecoveryStrategy
): string | undefined {
  if (strategy !== recoveryStrategy.query || !query.recovery) return undefined;
  if (query.format === 'composed') {
    return query.recovery.segment;
  }
  return query.recovery.query;
}

const RECOVERY_STRATEGY_LABELS: Record<RecoveryStrategy, string> = {
  query: i18n.translate('xpack.alertingV2.ruleDetails.recoveryCustom', {
    defaultMessage: 'Custom',
  }),
  no_breach: i18n.translate('xpack.alertingV2.ruleDetails.recoveryDefault', {
    defaultMessage: 'Default',
  }),
  none: i18n.translate('xpack.alertingV2.ruleDetails.recoveryNone', {
    defaultMessage: 'No recovery',
  }),
};

export function formatRecoveryStrategy(strategy?: RecoveryStrategy | null): string {
  if (strategy == null) return EMPTY_VALUE;
  return RECOVERY_STRATEGY_LABELS[strategy];
}
