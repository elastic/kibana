/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InfoBlockItem } from '@kbn/flyout-info-blocks';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { getFrequencyLabel, getGroupingModeLabel } from '../labels';
import { BadgeList } from '../badge_list';

/** Builds the `InfoBlockItem[]` array for the Notification section of the action policy details flyout. */
export const getNotificationInfoBlocks = (
  policy: Partial<ActionPolicyResponse>
): InfoBlockItem[] => {
  const { grouping_mode: groupingMode, group_by: groupBy, throttle } = policy;

  const blocks: InfoBlockItem[] = [
    {
      id: 'dispatchMode',
      title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.dispatchMode', {
        defaultMessage: 'Dispatch per',
      }),
      value: getGroupingModeLabel(groupingMode),
      'data-test-subj': 'actionPolicyDetailsFlyoutDispatchModeBlock',
    },
  ];

  if (groupingMode === 'per_field' && groupBy && groupBy.length > 0) {
    blocks.push({
      id: 'groupBy',
      title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.groupBy', {
        defaultMessage: 'Group by',
      }),
      value: <BadgeList items={groupBy} />,
      'data-test-subj': 'actionPolicyDetailsFlyoutGroupByBlock',
    });
  }

  blocks.push({
    id: 'frequency',
    title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.frequency', {
      defaultMessage: 'Frequency',
    }),
    value: getFrequencyLabel(throttle, groupingMode),
    'data-test-subj': 'actionPolicyDetailsFlyoutFrequencyBlock',
  });

  return blocks;
};
