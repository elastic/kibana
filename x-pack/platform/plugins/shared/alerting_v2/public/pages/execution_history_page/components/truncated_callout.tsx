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

type MatchedType = 'policies' | 'rules';

interface Props {
  searchParam?: string;
  data?: {
    search_matches: SearchMatchCounts | null;
  };
}

export const TruncatedCallout = ({ data, searchParam }: Props) => {
  const searchMatches = data?.search_matches ?? null;
  const matchedTypes: MatchedType[] =
    searchMatches !== null
      ? (['policies', 'rules'] as const).filter((t) => searchMatches[t] > 0)
      : [];
  const showSearchTruncatedCallout =
    searchParam !== undefined &&
    searchMatches !== null &&
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

const renderMatchedPart = (matches: SearchMatchCounts, type: MatchedType): string =>
  type === 'policies'
    ? i18n.translate('xpack.alertingV2.executionHistory.searchTruncatedCallout.policiesPart', {
        defaultMessage: '{total} matching action policies',
        values: { total: matches.policies },
      })
    : i18n.translate('xpack.alertingV2.executionHistory.searchTruncatedCallout.rulesPart', {
        defaultMessage: '{total} matching rules',
        values: { total: matches.rules },
      });

const buildSearchTruncatedCalloutTitle = (
  matches: SearchMatchCounts,
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
    defaultMessage: 'Showing events for the first {summary}. Refine your search to narrow results.',
    values: { summary: summaryText },
  });
};
