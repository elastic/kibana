/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Fragment } from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isExactName } from '../../../common/resolution';
import type { BoostProfileType, BoostRule } from '../../../common/types';
import type { DetailsListItem } from '../details/details_list';

export const TARGETS_LABEL = i18n.translate('xpack.boost.ruleDetails.targets', {
  defaultMessage: 'Targets',
});

export const PRIORITY_LABEL = i18n.translate('xpack.boost.ruleDetails.priority', {
  defaultMessage: 'Priority',
});

/**
 * How a rule chooses its targets, which decides how Elasticsearch ranks it among rules of the same
 * priority: a `*` pattern or one name. A rule saved with several names, which the prototype once
 * allowed, lists them.
 */
export type RuleTargetKind = 'pattern' | 'name' | 'names';

export const getRuleTargetKind = (patterns: readonly string[]): RuleTargetKind => {
  if (patterns.length > 1) {
    return 'names';
  }
  const [pattern = ''] = patterns;
  return isExactName(pattern) ? 'name' : 'pattern';
};

const TARGET_LABELS: Readonly<
  Record<Exclude<RuleTargetKind, 'pattern'>, Record<BoostProfileType, string>>
> = {
  name: {
    indices: i18n.translate('xpack.boost.ruleDetails.indexTarget', { defaultMessage: 'Index' }),
    data_streams: i18n.translate('xpack.boost.ruleDetails.dataStreamTarget', {
      defaultMessage: 'Data stream',
    }),
  },
  names: {
    indices: i18n.translate('xpack.boost.ruleDetails.indicesTarget', { defaultMessage: 'Indices' }),
    data_streams: i18n.translate('xpack.boost.ruleDetails.dataStreamsTarget', {
      defaultMessage: 'Data streams',
    }),
  },
};

/**
 * What a rule targets, as it's typed in the rule form: a pattern, such as a default rule's `*`, a
 * name, or names.
 */
export const getRuleTargets = (
  { index_patterns: patterns }: BoostRule,
  type: BoostProfileType | undefined
): NonNullable<ReactNode> => {
  const kind = getRuleTargetKind(patterns);
  const label =
    kind === 'pattern'
      ? i18n.translate('xpack.boost.ruleDetails.patternTarget', {
          defaultMessage: 'Index pattern',
        })
      : TARGET_LABELS[kind][type ?? 'indices'];
  // One element, so the label and its names stay inline in a flex box, such as a table cell.
  return (
    <span>
      {label}{' '}
      {patterns.map((pattern, index) => (
        <Fragment key={pattern}>
          {index > 0 && ', '}
          <EuiCode>{pattern}</EuiCode>
        </Fragment>
      ))}
    </span>
  );
};

/** A rule's targets and priority, as a details list's items. */
export const getRuleTargetItems = (
  rule: BoostRule,
  type: BoostProfileType | undefined
): DetailsListItem[] => {
  return [
    {
      title: TARGETS_LABEL,
      description: getRuleTargets(rule, type),
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
