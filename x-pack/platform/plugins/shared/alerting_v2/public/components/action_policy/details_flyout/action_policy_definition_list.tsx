/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiDescriptionListProps,
} from '@elastic/eui';
import type {
  ActionPolicyDestination,
  GroupingMode,
  ThrottleStrategy,
} from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getGroupingModeLabel, getThrottleStrategyLabel } from '../labels';
import { BadgeList } from './badge_list';
import { DestinationRow } from './destination_row';

const EMPTY_VALUE = '-';

export interface ActionPolicyDefinitionListProps {
  description?: string;
  tags?: string[];
  matcher?: string | null;
  groupingMode?: GroupingMode;
  groupBy?: string[];
  throttle?: { strategy?: ThrottleStrategy; interval?: string };
  destinations: ActionPolicyDestination[];
  resolvedDestinations?: Record<string, { name: string; isDraft: boolean }>;
}

export const ActionPolicyDefinitionList = ({
  description,
  tags,
  matcher,
  groupingMode,
  groupBy,
  throttle,
  destinations,
  resolvedDestinations,
}: ActionPolicyDefinitionListProps) => {
  const items = useMemo((): EuiDescriptionListProps['listItems'] => {
    const list: EuiDescriptionListProps['listItems'] = [
      {
        title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.description', {
          defaultMessage: 'Description',
        }),
        description: description || EMPTY_VALUE,
      },
      {
        title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.tags', {
          defaultMessage: 'Tags',
        }),
        description: tags && tags.length > 0 ? <BadgeList items={tags} /> : EMPTY_VALUE,
      },
      {
        title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.matcher', {
          defaultMessage: 'Matcher',
        }),
        description: matcher ? (
          <EuiCode>{matcher}</EuiCode>
        ) : (
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.actionPolicyDefinition.matchesAll"
              defaultMessage="Matches all alerts."
            />
          </EuiText>
        ),
      },
      {
        title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.dispatchMode', {
          defaultMessage: 'Dispatch per',
        }),
        description: getGroupingModeLabel(groupingMode),
      },
    ];

    if (groupingMode === 'per_field' && groupBy && groupBy.length > 0) {
      list.push({
        title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.groupBy', {
          defaultMessage: 'Group by',
        }),
        description: <BadgeList items={groupBy} />,
      });
    }

    list.push({
      title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.frequency', {
        defaultMessage: 'Frequency',
      }),
      description: (
        <>
          {getThrottleStrategyLabel(throttle?.strategy, groupingMode)}
          {throttle?.interval && (
            <>
              {' '}
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.alertingV2.actionPolicyDefinition.interval"
                  defaultMessage="Every {interval}"
                  values={{ interval: throttle.interval }}
                />
              </EuiText>
            </>
          )}
        </>
      ),
    });

    list.push({
      title: i18n.translate('xpack.alertingV2.actionPolicyDefinition.destinations', {
        defaultMessage: 'Destinations',
      }),
      description:
        destinations.length === 0 ? (
          EMPTY_VALUE
        ) : (
          <EuiFlexGroup direction="column" gutterSize="xs">
            {destinations.map((destination) => {
              const resolved = resolvedDestinations?.[destination.id];
              return (
                <EuiFlexItem key={`${destination.type}-${destination.id}`}>
                  <DestinationRow
                    destination={destination}
                    name={resolved?.name}
                    isDraft={resolved?.isDraft}
                  />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        ),
    });

    return list;
  }, [description, tags, matcher, groupingMode, groupBy, throttle, destinations, resolvedDestinations]);

  return <EuiDescriptionList compressed type="column" listItems={items} />;
};
