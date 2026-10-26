/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { SearchMatchCounts } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';

type MatchedType = 'policy_count' | 'rule_count';

// The Rules tab only reports rule matches, so `policy_count` is optional.
type SearchMatches = Omit<SearchMatchCounts, 'policy_count'> &
  Partial<Pick<SearchMatchCounts, 'policy_count'>>;

interface Props {
  searchParam?: string;
  data?: {
    search_matches?: SearchMatches;
  };
}

export const TruncatedCallout = ({ data, searchParam }: Props) => {
  const searchMatches = data?.search_matches;
  const matchedTypes: MatchedType[] = searchMatches
    ? (['policy_count', 'rule_count'] as const).filter((t) => (searchMatches[t] ?? 0) > 0)
    : [];
  const showSearchTruncatedCallout =
    searchParam !== undefined &&
    searchMatches !== undefined &&
    searchMatches.is_truncated &&
    matchedTypes.length > 0;

  return showSearchTruncatedCallout ? (
    <>
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        iconType="warning"
        title={buildSearchTruncatedCalloutTitle(searchMatches, matchedTypes)}
      />
      <EuiSpacer size="m" />
    </>
  ) : null;
};

const renderMatchedPart = (matches: SearchMatches, type: MatchedType): string =>
  type === 'policy_count'
    ? i18n.translate('xpack.alertingV2.executionHistory.searchTruncatedCallout.policiesPart', {
        defaultMessage: '{total} matching action policies',
        values: { total: matches.policy_count ?? 0 },
      })
    : i18n.translate('xpack.alertingV2.executionHistory.searchTruncatedCallout.rulesPart', {
        defaultMessage: '{total} matching rules',
        values: { total: matches.rule_count },
      });

const buildSearchTruncatedCalloutTitle = (
  matches: SearchMatches,
  matchedTypes: MatchedType[]
): string => {
  const summary = matchedTypes.map((t) => renderMatchedPart(matches, t));
  const summaryText =
    summary.length === 2
      ? i18n.translate('xpack.alertingV2.executionHistory.searchTruncatedCallout.joinedSummary', {
          defaultMessage: '{first} and {second}',
          values: { first: summary[0], second: summary[1] },
        })
      : summary[0];

  return i18n.translate('xpack.alertingV2.executionHistory.searchTruncatedCallout', {
    defaultMessage:
      'Your search matched {summary}, but only a subset of these events is shown. Refine your search to narrow results.',
    values: { summary: summaryText },
  });
};
