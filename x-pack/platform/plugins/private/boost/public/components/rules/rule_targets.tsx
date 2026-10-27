/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostDataSource, BoostProfileType, BoostRule } from '../../../common/types';
import type { DetailsListItem } from '../details/details_list';
import { formatDataSourceCount } from '../format';
import { getAllUnmatchedLabel } from './rule_matches';

export const TARGETS_LABEL = i18n.translate('xpack.boost.ruleDetails.targets', {
  defaultMessage: 'Targets',
});

export const PRIORITY_LABEL = i18n.translate('xpack.boost.ruleDetails.priority', {
  defaultMessage: 'Priority',
});

/**
 * What a rule targets, as the rule form opens it: what a default rule applies to, a pattern, or
 * how many names were selected.
 */
export const getRuleTargets = (
  { is_builtin: isDefaultRule, index_patterns: patterns }: BoostRule,
  type: BoostProfileType | undefined,
  dataSources: readonly BoostDataSource[]
): NonNullable<ReactNode> => {
  const existingNames = new Set(dataSources.map(({ name }) => name));
  const [firstPattern = ''] = patterns;
  const isPattern =
    patterns.length === 1 && (firstPattern.includes('*') || !existingNames.has(firstPattern));

  // One element, so the label and pattern stay inline in a flex box, such as a table cell.
  return isDefaultRule ? (
    getAllUnmatchedLabel(type)
  ) : isPattern ? (
    <span>
      {i18n.translate('xpack.boost.ruleDetails.patternTarget', {
        defaultMessage: 'Index pattern',
      })}{' '}
      <EuiCode>{firstPattern}</EuiCode>
    </span>
  ) : (
    i18n.translate('xpack.boost.ruleDetails.selectedTargets', {
      defaultMessage: 'Selected {targets}',
      values: { targets: formatDataSourceCount(type, patterns.length) },
    })
  );
};

/** A rule's targets and priority, as a details list's items. */
export const getRuleTargetItems = (
  rule: BoostRule,
  type: BoostProfileType | undefined,
  dataSources: readonly BoostDataSource[]
): DetailsListItem[] => {
  return [
    {
      title: TARGETS_LABEL,
      description: getRuleTargets(rule, type, dataSources),
    },
    {
      title: PRIORITY_LABEL,
      tip: i18n.translate('xpack.boost.ruleDetails.priorityTip', {
        defaultMessage:
          'When several rules match the same index or data stream, the highest priority applies.',
      }),
      description: rule.priority,
    },
  ];
};
