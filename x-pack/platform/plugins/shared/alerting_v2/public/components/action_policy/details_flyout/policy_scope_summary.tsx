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

export type PolicyScopeKind = 'catchAll' | 'expressionOnly' | 'tags';

const normalizeMatcher = (matcher?: PolicyMatcher | null) => ({
  tags: matcher?.tags?.length ? matcher.tags : null,
  expression: matcher?.expression?.trim() || null,
});

/** Classifies a policy matcher by what narrows down the rules it applies to. */
export const getPolicyScopeKind = (matcher?: PolicyMatcher | null): PolicyScopeKind => {
  const { tags, expression } = normalizeMatcher(matcher);
  if (tags) {
    return 'tags';
  }
  return expression ? 'expressionOnly' : 'catchAll';
};

interface Props {
  matcher?: PolicyMatcher | null;
}

export const PolicyScopeSummary = ({ matcher }: Props) => {
  const { tags: matcherTags, expression: matcherExpression } = normalizeMatcher(matcher);

  const policyScopeSummary =
    matcherTags && matcherExpression
      ? i18n.translate(
          'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.tagsAndExpression',
          {
            defaultMessage:
              'This policy matches all alerts from rules with one of the following tags AND the matching query.',
          }
        )
      : matcherTags
      ? i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.tags', {
          defaultMessage:
            'This policy matches all alerts from rules with one of the following tags.',
        })
      : matcherExpression
      ? i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.expression', {
          defaultMessage: 'This policy matches all alerts matching this query.',
        })
      : i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.matchesAll', {
          defaultMessage: 'This policy matches all alerts.',
        });

  return (
    <>
      <EuiText size="s">{policyScopeSummary}</EuiText>
      {matcherTags && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.ruleTags',
                  { defaultMessage: 'Rule tags:' }
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
