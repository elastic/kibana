/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';

import {
  RULE_STATUS_ACTIVE,
  RULE_STATUS_ERROR,
  RULE_STATUS_WARNING,
  RULE_STATUS_OK,
  RULE_STATUS_PENDING,
  RULE_STATUS_UNKNOWN,
  RULE_LAST_RUN_OUTCOME_SUCCEEDED_DESCRIPTION,
  RULE_LAST_RUN_OUTCOME_WARNING_DESCRIPTION,
  RULE_LAST_RUN_OUTCOME_FAILED_DESCRIPTION,
} from '../translations';

interface RulesListStatusesProps {
  rulesStatuses: Record<string, number>;
  rulesLastRunOutcomes: Record<string, number>;
}

export const RulesListStatuses = (props: RulesListStatusesProps) => {
  const { rulesStatuses, rulesLastRunOutcomes } = props;

  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  if (isRuleUsingExecutionStatus) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiHealth color="success" data-test-subj="totalActiveRulesCount">
            {RULE_STATUS_ACTIVE(rulesStatuses.active)}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="danger" data-test-subj="totalErrorRulesCount">
            {RULE_STATUS_ERROR(rulesStatuses.error)}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="warning" data-test-subj="totalWarningRulesCount">
            {RULE_STATUS_WARNING(rulesStatuses.warning)}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="primary" data-test-subj="totalOkRulesCount">
            {RULE_STATUS_OK(rulesStatuses.ok)}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="accent" data-test-subj="totalPendingRulesCount">
            {RULE_STATUS_PENDING(rulesStatuses.pending)}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="subdued" data-test-subj="totalUnknownRulesCount">
            {RULE_STATUS_UNKNOWN(rulesStatuses.unknown)}
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiHealth color="success" data-test-subj="totalSucceededRulesCount">
          {RULE_LAST_RUN_OUTCOME_SUCCEEDED_DESCRIPTION(rulesLastRunOutcomes.succeeded)}
        </EuiHealth>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHealth color="danger" data-test-subj="totalFailedRulesCount">
          {RULE_LAST_RUN_OUTCOME_FAILED_DESCRIPTION(rulesLastRunOutcomes.failed)}
        </EuiHealth>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHealth color="warning" data-test-subj="totalWarningRulesCount">
          {RULE_LAST_RUN_OUTCOME_WARNING_DESCRIPTION(rulesLastRunOutcomes.warning)}
        </EuiHealth>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
