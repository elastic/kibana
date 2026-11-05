/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth, EuiToolTip, EuiStat, useEuiTheme } from '@elastic/eui';
import type { RuleTableItem } from '../../../../types';
import {
  getRuleHealthColor,
  getRuleStatusMessage,
} from '../../../../common/lib/rule_status_helpers';
import {
  ALERT_STATUS_LICENSE_ERROR,
  rulesLastRunOutcomeTranslationMapping,
  rulesStatusesTranslationsMapping,
} from '../translations';

export interface RulesListTableStatusCellProps {
  rule: RuleTableItem;
}

export const RulesListTableStatusCell = ({ rule }: RulesListTableStatusCellProps) => {
  const { euiTheme } = useEuiTheme();
  const { lastRun } = rule;

  const healthColor = getRuleHealthColor(rule, euiTheme);
  const statusMessage = getRuleStatusMessage({
    rule,
    licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
    lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
    executionStatusTranslations: rulesStatusesTranslationsMapping,
  });
  const tooltipMessage = lastRun?.outcome === 'failed' ? `Error: ${lastRun?.outcomeMsg}` : null;

  if (!statusMessage) {
    return (
      <EuiStat
        titleSize="xs"
        title="--"
        description=""
        isLoading={!lastRun?.outcome && !rule.nextRun}
      />
    );
  }

  const health = (
    <EuiHealth
      data-test-subj={`ruleStatus-${lastRun?.outcome || 'pending'}`}
      color={healthColor || 'default'}
    >
      {statusMessage}
    </EuiHealth>
  );

  return tooltipMessage ? (
    <EuiToolTip data-test-subj="ruleStatus-error-tooltip" position="top" content={tooltipMessage}>
      {health}
    </EuiToolTip>
  ) : (
    health
  );
};
