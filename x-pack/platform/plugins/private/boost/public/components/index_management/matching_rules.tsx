/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostDataSource, BoostProfile, BoostRule } from '../../../common/types';
import { PRIORITY_LABEL, TARGETS_LABEL, getRuleTargets } from '../rules/rule_targets';
import { ProfileLink, RuleLink } from './boost_page_links';

interface RankedRule {
  rank: number;
  rule: BoostRule;
}

interface MatchingRulesProps {
  /** Every rule that matches, in the order Elasticsearch ranks them. */
  matches: readonly BoostRule[];
  profilesByName: ReadonlyMap<string, BoostProfile>;
  dataSources: readonly BoostDataSource[];
}

/**
 * Every rule that matches an index or data stream, always in the order Elasticsearch ranks them,
 * with the first, which applies, marked. Its columns don't sort: the order is the point, and
 * sorting by priority alone would misorder rules that share one.
 */
export const MatchingRules = ({ matches, profilesByName, dataSources }: MatchingRulesProps) => {
  const columns: Array<EuiBasicTableColumn<RankedRule>> = [
    {
      field: 'rank',
      name: i18n.translate('xpack.boost.matchingRules.rankColumn', { defaultMessage: 'Rank' }),
      nameTooltip: {
        icon: 'info',
        content: i18n.translate('xpack.boost.matchingRules.rankTip', {
          defaultMessage:
            'Elasticsearch ranks matching rules by priority, highest first. Among rules with the same priority, exact names rank above other patterns, and those above *. The first rule applies.',
        }),
      },
      width: '6em',
      align: 'right',
    },
    {
      name: i18n.translate('xpack.boost.matchingRules.ruleColumn', {
        defaultMessage: 'Rule name',
      }),
      render: ({ rank, rule }: RankedRule) => <RuleLink rule={rule} isApplied={rank === 1} />,
    },
    {
      name: i18n.translate('xpack.boost.matchingRules.profileColumn', {
        defaultMessage: 'Profile name',
      }),
      render: ({ rule }: RankedRule) => <ProfileLink profileName={rule.boost_profile} />,
    },
    {
      name: PRIORITY_LABEL,
      width: '7em',
      align: 'right',
      render: ({ rule }: RankedRule) => rule.priority,
    },
    {
      name: TARGETS_LABEL,
      render: ({ rule }: RankedRule) =>
        getRuleTargets(rule, profilesByName.get(rule.boost_profile)?.type, dataSources),
    },
  ];

  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.boost.matchingRules.caption', {
        defaultMessage: 'Matching boost rules, in the order they rank',
      })}
      items={matches.map((rule, index) => ({ rank: index + 1, rule }))}
      itemId={({ rule }: RankedRule) => rule.name}
      columns={columns}
      data-test-subj="boostIndexTabMatchingRules"
    />
  );
};
