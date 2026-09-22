/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
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
  { defaultMessage: 'Has query condition' }
);

const expressionTooltipBody = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.reason.expressionBody',
  {
    defaultMessage:
      'This policy has an additional KQL query. It is evaluated against alert data at dispatch time and is not previewed here.',
  }
);

export const getMatchedTags = (matcherTags: string[], ruleTags: string[]): string[] => {
  const ruleTagSet = new Set(ruleTags);
  const matched = matcherTags.filter((tag) => ruleTagSet.has(tag));
  return matched.length > 0 ? matched : matcherTags;
};

interface Props {
  category: MatchedActionPolicyCategory;
  matcher: PolicyMatcher | null | undefined;
  ruleTags: string[];
}

export const MatchedPolicyReason = ({ category, matcher, ruleTags }: Props) => {
  const { euiTheme } = useEuiTheme();
  const trimmedExpression = matcher?.expression?.trim() || null;
  const matcherTags = matcher?.tags?.length ? matcher.tags : null;

  const tagCircleStyles = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: ${euiTheme.size.l};
    block-size: ${euiTheme.size.l};
    border: ${euiTheme.border.thin};
    border-radius: 50%;
    color: ${euiTheme.colors.textSubdued};
  `;

  const isCatchAll = category === 'catch-all';

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
  const tagsTooltipContent = matchedTags
    ? i18n.translate(
        'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.reason.tagsTooltip',
        {
          defaultMessage: 'Matching rule tags: {tags}',
          values: { tags: matchedTags.join(', ') },
        }
      )
    : '';

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
      {matchedTags && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={tagsTooltipContent}>
            <span
              css={tagCircleStyles}
              tabIndex={0}
              aria-label={tagsTooltipContent}
              data-test-subj="matchedPolicyReasonTags"
            >
              <EuiIcon type="tag" size="s" aria-hidden />
            </span>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {trimmedExpression && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            title={expressionTooltipTitle}
            content={
              <>
                <p>{expressionTooltipBody}</p>
                <EuiCode>{trimmedExpression}</EuiCode>
              </>
            }
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
