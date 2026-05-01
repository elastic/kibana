/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDuration } from '@kbn/alerting-plugin/common';
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
  if (stateTransition?.pending_count == null && stateTransition?.pending_timeframe == null) {
    return EMPTY_VALUE;
  }

  if (stateTransition.pending_count === 0 && stateTransition.pending_timeframe == null) {
    return IMMEDIATE_LABEL;
  }

  return formatDelay({
    count: stateTransition.pending_count,
    countLabel: matchLabel,
    timeframe: stateTransition.pending_timeframe,
    operator: stateTransition.pending_operator,
  });
}

export function formatRecoveryDelay(stateTransition: RuleApiResponse['state_transition']): string {
  if (stateTransition?.recovering_count == null && stateTransition?.recovering_timeframe == null) {
    return EMPTY_VALUE;
  }

  if (stateTransition.recovering_count === 0 && stateTransition.recovering_timeframe == null) {
    return IMMEDIATE_LABEL;
  }

  return formatDelay({
    count: stateTransition.recovering_count,
    countLabel: recoveryLabel,
    timeframe: stateTransition.recovering_timeframe,
    operator: stateTransition.recovering_operator,
  });
}
