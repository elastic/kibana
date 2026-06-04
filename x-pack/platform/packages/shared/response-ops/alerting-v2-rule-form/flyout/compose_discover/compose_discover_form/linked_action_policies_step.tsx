/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useWatch } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import type { MatchedActionPolicyCategory } from '@kbn/alerting-v2-schemas';
import {
  EuiBadge,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ComposeFormValues } from '../compose_form_types';
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

const actionPoliciesTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.title',
  { defaultMessage: 'Action policies' }
);

const matchingSubtext = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.matchingSubtext',
  { defaultMessage: 'These policies currently match this rule.' }
);

const emptyStateLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.noMatchesEmptyState',
  { defaultMessage: '0 matching action policies' }
);

const errorTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.errorTitle',
  { defaultMessage: 'Failed to load linked action policies' }
);

interface Props {
  http: HttpStart;
  ruleId?: string;
}

export const LinkedActionPoliciesStep = ({ http, ruleId }: Props) => {
  const metadata = useWatch<ComposeFormValues, 'metadata'>({ name: 'metadata' });
  const name = ruleId ? undefined : metadata?.name;
  const tags = ruleId ? undefined : metadata?.tags;

  const { isLoading, error, items } = useMatchedActionPolicies({ http, ruleId, name, tags });

  const options = items.map(({ actionPolicy, category }) => ({
    key: actionPolicy.id,
    label: actionPolicy.name,
    append: <EuiBadge color={CATEGORY_COLORS[category]}>{CATEGORY_LABELS[category]}</EuiBadge>,
  }));

  return (
    <>
      <EuiTitle size="xs">
        <h3>{actionPoliciesTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{matchingSubtext}</p>
      </EuiText>
      <EuiSpacer size="s" />

      {isLoading && <EuiLoadingSpinner size="m" data-test-subj="linkedActionPoliciesLoading" />}

      {error && (
        <EuiCallOut
          announceOnMount
          title={errorTitle}
          color="danger"
          iconType="error"
          data-test-subj="linkedActionPoliciesError"
        >
          <p aria-label={error.message}>{error.message}</p>
        </EuiCallOut>
      )}

      {!isLoading && !error && (
        <EuiSelectable
          options={options}
          onChange={() => {}}
          color="subdued"
          emptyMessage={
            <EuiText size="s" color="subdued" data-test-subj="linkedActionPoliciesEmpty">
              <p>{emptyStateLabel}</p>
            </EuiText>
          }
          listProps={{ showIcons: false, bordered: true, isVirtualized: false }}
        >
          {(list) => list}
        </EuiSelectable>
      )}
    </>
  );
};
