/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../services/rules_api';

export const EMPTY_VALUE = '-';

const IMMEDIATE_LABEL = i18n.translate('xpack.alertingV2.ruleDetails.immediateValue', {
  defaultMessage: 'Immediate',
});

export function formatAlertDelay(stateTransition: RuleApiResponse['state_transition']): string {
  if (stateTransition?.pending_count == null) return EMPTY_VALUE;
  if (stateTransition.pending_count === 0) return IMMEDIATE_LABEL;
  return i18n.translate('xpack.alertingV2.ruleDetails.alertDelayValue', {
    defaultMessage: 'After {count} {count, plural, one {match} other {matches}}',
    values: { count: stateTransition.pending_count },
  });
}

export function formatRecoveryDelay(stateTransition: RuleApiResponse['state_transition']): string {
  if (stateTransition?.recovering_count == null) return EMPTY_VALUE;
  if (stateTransition.recovering_count === 0) return IMMEDIATE_LABEL;
  return i18n.translate('xpack.alertingV2.ruleDetails.recoveryDelayValue', {
    defaultMessage: 'After {count} {count, plural, one {recovery} other {recoveries}}',
    values: { count: stateTransition.recovering_count },
  });
}
