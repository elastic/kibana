/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import type { MatchedActionPolicyCategory } from '@kbn/alerting-v2-schemas';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useMatchedActionPolicies } from './use_matched_action_policies';

const CATEGORY_LABELS: Record<MatchedActionPolicyCategory, string> = {
  direct: i18n.translate('xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.directBadge', {
    defaultMessage: 'direct',
  }),
  global: i18n.translate('xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.globalBadge', {
    defaultMessage: 'global',
  }),
  'global-filtered': i18n.translate(
    'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.globalFilteredBadge',
    { defaultMessage: 'global-filtered' }
  ),
};

const CATEGORY_COLORS: Record<MatchedActionPolicyCategory, string> = {
  direct: 'success',
  global: 'default',
  'global-filtered': 'primary',
};

const emptyStateLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.emptyState',
  { defaultMessage: 'No action policies are linked to this rule.' }
);

const errorTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.errorTitle',
  { defaultMessage: 'Failed to load linked action policies' }
);

interface LinkedActionPoliciesStepProps {
  http: HttpStart;
  ruleId: string;
}

export const LinkedActionPoliciesStep: React.FC<LinkedActionPoliciesStepProps> = ({
  http,
  ruleId,
}) => {
  const { isLoading, error, items } = useMatchedActionPolicies({ http, ruleId });

  if (isLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="linkedActionPoliciesLoading" />;
  }

  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        title={errorTitle}
        color="danger"
        iconType="error"
        data-test-subj="linkedActionPoliciesError"
      >
        <p aria-label={error.message}>{error.message}</p>
      </EuiCallOut>
    );
  }

  if (items.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="linkedActionPoliciesEmpty">
        <p>{emptyStateLabel}</p>
      </EuiText>
    );
  }

  return (
    <>
      {items.map(({ actionPolicy, category }) => (
        <React.Fragment key={actionPolicy.id}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow>
              <EuiText size="s">
                <span>{actionPolicy.name}</span>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={CATEGORY_COLORS[category]}>{CATEGORY_LABELS[category]}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
    </>
  );
};
