/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiCode, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { MatchedActionPolicyCategory, PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React from 'react';

const catchAllBadgeLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.reason.catchAllBadge',
  { defaultMessage: 'Catch-all' }
);

const catchAllTooltip = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.reason.catchAllTooltip',
  { defaultMessage: 'Applies to every rule.' }
);

const expressionBadgeLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.reason.expressionBadge',
  { defaultMessage: 'Expression' }
);

const expressionTooltipTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.reason.expressionTitle',
  { defaultMessage: 'Matches query' }
);

/** The rule tags that satisfied a policy's tag clause; falls back to the clause when nothing intersects. */
export const getMatchedTags = (matcherTags: string[], ruleTags: string[]): string[] => {
  const ruleTagSet = new Set(ruleTags);
  const matched = matcherTags.filter((tag) => ruleTagSet.has(tag));
  // A `tags` policy must have matched at least one tag, but the form's tags can be a keystroke
  // ahead of the fetched result — show the clause rather than an empty list.
  return matched.length > 0 ? matched : matcherTags;
};

interface Props {
  category: MatchedActionPolicyCategory;
  matcher: PolicyMatcher | null | undefined;
  ruleTags: string[];
}

export const MatchedPolicyReason = ({ category, matcher, ruleTags }: Props) => {
  const trimmedExpression = matcher?.expression?.trim() || null;
  const matcherTags = matcher?.tags?.length ? matcher.tags : null;

  // The `global` category is the API's name for a catch-all policy (applies to every rule).
  const isCatchAll = category === 'global';

  if (isCatchAll) {
    return (
      <EuiToolTip content={catchAllTooltip}>
        <EuiBadge color="hollow" title="" tabIndex={0} data-test-subj="matchedPolicyReasonCatchAll">
          {catchAllBadgeLabel}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  const matchedTags = matcherTags ? getMatchedTags(matcherTags, ruleTags) : null;

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {matchedTags && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.reason.tagsTooltip',
              {
                defaultMessage: 'Matching rule tags: {tags}',
                values: { tags: matchedTags.join(', ') },
              }
            )}
          >
            <EuiBadge
              color="hollow"
              iconType="tag"
              title=""
              tabIndex={0}
              data-test-subj="matchedPolicyReasonTags"
            >
              {i18n.translate(
                'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.reason.tagsBadge',
                {
                  defaultMessage: 'Tags ({count})',
                  values: { count: matchedTags.length },
                }
              )}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {trimmedExpression && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            title={expressionTooltipTitle}
            content={<EuiCode>{trimmedExpression}</EuiCode>}
          >
            <EuiBadge
              color="hollow"
              iconType="filter"
              title=""
              tabIndex={0}
              data-test-subj="matchedPolicyReasonExpression"
            >
              {expressionBadgeLabel}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
