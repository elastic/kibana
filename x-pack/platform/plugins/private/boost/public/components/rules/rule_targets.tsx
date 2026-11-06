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
import { useAllowsMultipleTargets } from '../../prototype/prototype_settings';
import { getRuleTargetMode } from './rule_draft';

export const TARGETS_LABEL = i18n.translate('xpack.boost.ruleDetails.targets', {
  defaultMessage: 'Targets',
});

export const PRIORITY_LABEL = i18n.translate('xpack.boost.ruleDetails.priority', {
  defaultMessage: 'Priority',
});

// That a rule uses a selection, without a count, which the rule's usage gives.
const SELECTED_TARGETS: Readonly<Record<BoostProfileType, { one: string; other: string }>> = {
  indices: {
    one: i18n.translate('xpack.boost.ruleDetails.selectedIndex', {
      defaultMessage: 'Selected index',
    }),
    other: i18n.translate('xpack.boost.ruleDetails.selectedIndices', {
      defaultMessage: 'Selected indices',
    }),
  },
  data_streams: {
    one: i18n.translate('xpack.boost.ruleDetails.selectedDataStream', {
      defaultMessage: 'Selected data stream',
    }),
    other: i18n.translate('xpack.boost.ruleDetails.selectedDataStreams', {
      defaultMessage: 'Selected data streams',
    }),
  },
};

interface RuleTargetsProps {
  rule: BoostRule;
  type: BoostProfileType | undefined;
  dataSources: readonly BoostDataSource[];
}

/**
 * What a rule targets, as the rule form opens it: a pattern, such as a default rule's `*`, or a
 * selection, plural like the form's mode while rules can select several.
 */
const RuleTargets = ({ rule, type, dataSources }: RuleTargetsProps) => {
  const allowsMultipleTargets = useAllowsMultipleTargets();
  const { index_patterns: patterns } = rule;
  const existingNames = new Set(dataSources.map(({ name }) => name));
  const [firstPattern = ''] = patterns;

  if (getRuleTargetMode(rule, existingNames) === 'pattern') {
    // One element, so the label and pattern stay inline in a flex box, such as a table cell.
    return (
      <span>
        {i18n.translate('xpack.boost.ruleDetails.patternTarget', {
          defaultMessage: 'Index pattern',
        })}{' '}
        <EuiCode>{firstPattern}</EuiCode>
      </span>
    );
  }
  // A rule saved with several while the prototype allowed it stays plural.
  const isPlural = allowsMultipleTargets || patterns.length > 1;
  return <>{SELECTED_TARGETS[type ?? 'indices'][isPlural ? 'other' : 'one']}</>;
};

/** What a rule targets: its pattern, or that it uses a selection. */
export const getRuleTargets = (
  rule: BoostRule,
  type: BoostProfileType | undefined,
  dataSources: readonly BoostDataSource[]
): NonNullable<ReactNode> => <RuleTargets rule={rule} type={type} dataSources={dataSources} />;

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
