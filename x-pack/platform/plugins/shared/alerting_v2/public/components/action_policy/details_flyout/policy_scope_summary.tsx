/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiCode, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const POLICY_SCOPE_LABEL = i18n.translate(
  'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.label',
  { defaultMessage: 'Policy scope' }
);

export type PolicyScopeKind = 'catchAll' | 'expressionOnly' | 'tagsOnly' | 'tagsAndExpression';

const POLICY_SCOPE_SUMMARIES: Record<PolicyScopeKind, string> = {
  tagsAndExpression: i18n.translate(
    'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.tagsAndExpression',
    {
      defaultMessage:
        'This policy matches all alerts from rules with one of the following routing tags AND the matching query.',
    }
  ),
  tagsOnly: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.tags', {
    defaultMessage:
      'This policy matches all alerts from rules with one of the following routing tags.',
  }),
  expressionOnly: i18n.translate(
    'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.expression',
    { defaultMessage: 'This policy matches all alerts matching this query.' }
  ),
  catchAll: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.matchesAll', {
    defaultMessage: 'This policy matches all alerts.',
  }),
};

const normalizeMatcher = (matcher?: PolicyMatcher | null) => ({
  tags: matcher?.tags?.length ? matcher.tags : null,
  expression: matcher?.expression?.trim() || null,
});

/** Classifies a policy matcher by whether routing tags, the matching query, or both narrow down its alerts. */
export const getPolicyScopeKind = (matcher?: PolicyMatcher | null): PolicyScopeKind => {
  const { tags, expression } = normalizeMatcher(matcher);
  if (tags) {
    return expression ? 'tagsAndExpression' : 'tagsOnly';
  }
  return expression ? 'expressionOnly' : 'catchAll';
};

interface Props {
  matcher?: PolicyMatcher | null;
}

export const PolicyScopeSummary = ({ matcher }: Props) => {
  const { tags: matcherTags, expression: matcherExpression } = normalizeMatcher(matcher);

  return (
    <>
      <EuiText size="s">{POLICY_SCOPE_SUMMARIES[getPolicyScopeKind(matcher)]}</EuiText>
      {matcherTags && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.ruleTags',
                  { defaultMessage: 'Routing tags:' }
                )}
              </EuiText>
            </EuiFlexItem>
            {matcherTags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
      {matcherExpression && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {i18n.translate(
              'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.advancedQuery',
              { defaultMessage: 'Advanced matching query:' }
            )}{' '}
            <EuiCode>{matcherExpression}</EuiCode>
          </EuiText>
        </>
      )}
    </>
  );
};
