/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, type EuiDescriptionListProps } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import {
  DISPATCH_PER_LABEL,
  FREQUENCY_LABEL,
  GROUP_BY_LABEL,
  getFrequencyLabel,
  getGroupingModeLabel,
} from '../labels';
import { BadgeList } from '../badge_list';
import { DestinationRow } from './destination_row';
import { MatcherSummary } from './matcher_summary';

type ListItem = NonNullable<EuiDescriptionListProps['listItems']>[0];

const EMPTY_VALUE = '-';

export const getDescriptionItem = (policy: Partial<ActionPolicyResponse>): ListItem => {
  const { description } = policy;
  return {
    title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.description', {
      defaultMessage: 'Description',
    }),
    description: description || EMPTY_VALUE,
  };
};

export const getMatcherItem = (policy: Partial<ActionPolicyResponse>): ListItem => {
  const { matcher } = policy;
  return {
    title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.matcher', {
      defaultMessage: 'Matcher',
    }),
    description: <MatcherSummary matcher={matcher} />,
  };
};

export const getDispatchModeItem = (policy: Partial<ActionPolicyResponse>): ListItem => {
  const { grouping_mode: groupingMode } = policy;
  return {
    title: DISPATCH_PER_LABEL,
    description: getGroupingModeLabel(groupingMode),
  };
};

export const getGroupByItem = (policy: Partial<ActionPolicyResponse>): ListItem | null => {
  const { grouping_mode: groupingMode, group_by: groupBy } = policy;
  if (groupingMode !== 'per_field' || !groupBy || groupBy.length === 0) {
    return null;
  }
  return {
    title: GROUP_BY_LABEL,
    description: <BadgeList items={groupBy} />,
  };
};

export const getFrequencyItem = (policy: Partial<ActionPolicyResponse>): ListItem => {
  const { throttle, grouping_mode: groupingMode } = policy;
  return {
    title: FREQUENCY_LABEL,
    description: getFrequencyLabel(throttle, groupingMode),
  };
};

export const getDestinationsItem = (policy: Partial<ActionPolicyResponse>): ListItem => {
  const { destinations = [] } = policy;
  return {
    title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.destinations', {
      defaultMessage: 'Destinations',
    }),
    description:
      destinations.length === 0 ? (
        EMPTY_VALUE
      ) : (
        <EuiFlexGroup direction="column" gutterSize="xs">
          {destinations.map((destination) => (
            <EuiFlexItem key={`${destination.type}-${destination.id}`}>
              <DestinationRow destination={destination} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
  };
};
