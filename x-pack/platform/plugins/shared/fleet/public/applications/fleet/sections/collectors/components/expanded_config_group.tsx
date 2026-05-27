/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import { pipelineConfigLabel } from '../../../../../../common/services/pipeline_config_label';
import type { CollectorGroup } from '../../../../../../common/types';
import { useGetCollectorGroupsQuery } from '../../../../../hooks/use_request/agents';

import { getSignalBadgeColor } from './signal_colors';

const ConfigHashTable: React.FC<{ group: CollectorGroup }> = ({ group }) => {
  const { euiTheme } = useEuiTheme();

  const kuery = useMemo(() => {
    if (group.isUngrouped) {
      return 'NOT non_identifying_attributes.config.name:*';
    }
    const escapedConfigName = group.group.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `non_identifying_attributes.config.name:"${escapedConfigName}"`;
  }, [group.group, group.isUngrouped]);

  const { data, isLoading } = useGetCollectorGroupsQuery(
    { groupBy: 'pipeline_config', kuery, perPage: 100, showInactive: false },
    { enabled: true }
  );

  const items = data?.items ?? [];

  const columns: Array<EuiBasicTableColumn<CollectorGroup>> = useMemo(
    () => [
      {
        field: 'group',
        name: i18n.translate('xpack.fleet.expandedConfigGroup.versionsColumn', {
          defaultMessage: 'Versions',
        }),
        width: '200px',
        render: (fingerprint: string) => (
          <EuiToolTip content={fingerprint}>
            <EuiBadge color="hollow">{pipelineConfigLabel(fingerprint)}</EuiBadge>
          </EuiToolTip>
        ),
      },
      {
        field: 'docCount',
        name: i18n.translate('xpack.fleet.expandedConfigGroup.collectorsColumn', {
          defaultMessage: 'Collectors',
        }),
        width: '100px',
      },
      {
        field: 'signals',
        name: i18n.translate('xpack.fleet.expandedConfigGroup.signalsColumn', {
          defaultMessage: 'Signals',
        }),
        width: '190px',
        render: (signals: string[]) => {
          if (!signals?.length) return '-';
          return (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {signals.map((signal) => {
                const [bgColor, textColor] = getSignalBadgeColor(euiTheme.colors.vis, signal);
                return (
                  <EuiFlexItem grow={false} key={signal}>
                    <EuiBadge
                      color={bgColor}
                      css={css`
                        color: ${textColor};
                      `}
                    >
                      {signal}
                    </EuiBadge>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          );
        },
      },
      {
        name: i18n.translate('xpack.fleet.expandedConfigGroup.alertsColumn', {
          defaultMessage: 'Alerts',
        }),
        width: '80px',
        render: () => '-',
      },
      {
        field: 'firstSeen',
        name: i18n.translate('xpack.fleet.expandedConfigGroup.firstSeenColumn', {
          defaultMessage: 'First seen',
        }),
        width: '120px',
        render: (firstSeen: string | undefined) => {
          if (!firstSeen) return '-';
          return (
            <EuiToolTip
              content={
                <FormattedDate
                  value={firstSeen}
                  year="numeric"
                  month="short"
                  day="2-digit"
                  hour="2-digit"
                  minute="2-digit"
                />
              }
            >
              <EuiText size="xs">
                <FormattedRelative value={firstSeen} />
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'lastSeen',
        name: i18n.translate('xpack.fleet.expandedConfigGroup.lastSeenColumn', {
          defaultMessage: 'Last seen',
        }),
        width: '120px',
        render: (lastSeen: string | undefined) => {
          if (!lastSeen) return '-';
          return (
            <EuiToolTip
              content={
                <FormattedDate
                  value={lastSeen}
                  year="numeric"
                  month="short"
                  day="2-digit"
                  hour="2-digit"
                  minute="2-digit"
                />
              }
            >
              <EuiText size="xs">
                <FormattedRelative value={lastSeen} />
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        name: i18n.translate('xpack.fleet.expandedConfigGroup.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        width: '70px',
        actions: [],
      },
    ],
    [euiTheme.colors.vis]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiBasicTable<CollectorGroup>
      data-test-subj="fleetConfigHashTable"
      tableCaption={i18n.translate('xpack.fleet.expandedConfigGroup.tableCaption', {
        defaultMessage: 'Pipeline configuration versions',
      })}
      items={items}
      itemId="group"
      columns={columns}
    />
  );
};

export const ExpandedConfigGroup: React.FC<{ group: CollectorGroup }> = ({ group }) => {
  return <ConfigHashTable group={group} />;
};
