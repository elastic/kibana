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
import type { BoostRule } from '../../../common/types';
import type { DetailsListItem } from '../details/details_list';

export const TARGETS_LABEL = i18n.translate('xpack.boost.ruleDetails.targets', {
  defaultMessage: 'Targets',
});

export const PRIORITY_LABEL = i18n.translate('xpack.boost.ruleDetails.priority', {
  defaultMessage: 'Priority',
});

/**
 * What a rule targets, as it's typed in the rule form: a name or a pattern, such as a default rule's
 * `*`, which says which it is.
 */
export const getRuleTargets = ({ index_patterns: patterns }: BoostRule): NonNullable<ReactNode> => (
  // One element, so several names stay inline in a flex box, such as a table cell.
  <span>
    {patterns.map((pattern, index) => (
      <Fragment key={pattern}>
        {index > 0 && ', '}
        <EuiCode>{pattern}</EuiCode>
      </Fragment>
    ))}
  </span>
);

/** A rule's targets and priority, as a details list's items. */
export const getRuleTargetItems = (rule: BoostRule): DetailsListItem[] => {
  return [
    {
      title: TARGETS_LABEL,
      description: getRuleTargets(rule),
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
