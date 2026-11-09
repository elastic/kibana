/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiHighlight,
  EuiText,
  euiTextTruncateCSS,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionPolicyRoutingTagItem } from '@kbn/alerting-v2-schemas';

export type RoutingTagOption = EuiComboBoxOptionOption<ActionPolicyRoutingTagItem>;

const getPolicyNames = ({ policies }: ActionPolicyRoutingTagItem): string[] =>
  policies.map(({ name }) => name);

const getHiddenPolicyCount = (item: ActionPolicyRoutingTagItem): number =>
  Math.max(item.policy_count - item.policies.length, 0);

/** The policy names on one line, ending in `, …` when more policies use the tag than are listed. */
export const getPolicyNamesText = (item: ActionPolicyRoutingTagItem): string => {
  const names = getPolicyNames(item).join(', ');
  return getHiddenPolicyCount(item) > 0 ? `${names}, …` : names;
};

/** The full count in words, e.g. "rna, 7 action policies: A, B, C, D, E, and 2 more". */
export const getSuggestionAriaLabel = (item: ActionPolicyRoutingTagItem): string =>
  i18n.translate('xpack.alertingV2.ruleForm.routingTagSuggestionAriaLabel', {
    defaultMessage:
      '{tag}, {policyCount, plural, one {# action policy} other {# action policies}}: {policyNames}{hiddenCount, plural, =0 {} other {, and # more}}',
    values: {
      tag: item.tag,
      policyCount: item.policy_count,
      policyNames: getPolicyNames(item).join(', '),
      hiddenCount: getHiddenPolicyCount(item),
    },
  });

export const buildRoutingTagOption = (item: ActionPolicyRoutingTagItem): RoutingTagOption => ({
  label: item.tag,
  value: item,
  'aria-label': getSuggestionAriaLabel(item),
  'data-test-subj': `ruleRoutingTagOption-${item.tag}`,
  append: (
    <EuiBadge color="hollow" data-test-subj="ruleRoutingTagOptionCount">
      {item.policy_count}
    </EuiBadge>
  ),
});

export const renderRoutingTagOption = (
  { label, value }: RoutingTagOption,
  searchValue: string,
  contentClassName: string
) => {
  if (!value) {
    return <span className={contentClassName}>{label}</span>;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none" className={contentClassName}>
      <EuiText size="s" css={euiTextTruncateCSS()}>
        <EuiHighlight search={searchValue} strict={true}>
          {label}
        </EuiHighlight>
      </EuiText>
      <EuiText
        size="xs"
        color="subdued"
        css={euiTextTruncateCSS()}
        data-test-subj="ruleRoutingTagOptionPolicies"
      >
        {getPolicyNamesText(value)}
      </EuiText>
    </EuiFlexGroup>
  );
};
