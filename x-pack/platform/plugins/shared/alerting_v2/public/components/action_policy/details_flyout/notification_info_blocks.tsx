/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InfoBlockItem } from '@kbn/flyout-info-blocks';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import {
  DISPATCH_PER_LABEL,
  FREQUENCY_LABEL,
  GROUP_BY_LABEL,
  getFrequencyLabel,
  getGroupingModeLabel,
} from '../labels';
import { BadgeList } from '../badge_list';

/** Builds the `InfoBlockItem[]` array for the Notification section of the action policy details flyout. */
export const getNotificationInfoBlocks = (
  policy: Partial<ActionPolicyResponse>
): InfoBlockItem[] => {
  const { grouping_mode: groupingMode, group_by: groupBy, throttle } = policy;

  const items: Array<InfoBlockItem | null> = [
    {
      id: 'dispatchMode',
      title: DISPATCH_PER_LABEL,
      value: getGroupingModeLabel(groupingMode),
      'data-test-subj': 'actionPolicyDetailsFlyoutDispatchModeBlock',
    },
    groupingMode === 'per_field' && groupBy?.length
      ? {
          id: 'groupBy',
          title: GROUP_BY_LABEL,
          value: <BadgeList items={groupBy} />,
          'data-test-subj': 'actionPolicyDetailsFlyoutGroupByBlock',
        }
      : null,
    {
      id: 'frequency',
      title: FREQUENCY_LABEL,
      value: getFrequencyLabel(throttle, groupingMode),
      'data-test-subj': 'actionPolicyDetailsFlyoutFrequencyBlock',
    },
  ];
  return items.filter((b): b is InfoBlockItem => b !== null);
};
