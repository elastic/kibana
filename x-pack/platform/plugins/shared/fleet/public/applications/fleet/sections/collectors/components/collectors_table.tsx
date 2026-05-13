/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  EuiLink,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui-theme-common';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

import type { OtelCollector } from '../../../../../../common/types/rest_spec/otel_collector';
import { useLink } from '../../../hooks';
import { Tags } from '../../agents/components/tags';

type VisColorKey = keyof EuiThemeComputed['colors']['vis'];

interface CollectorsTableProps {
  collectors: OtelCollector[];
  isLoading: boolean;
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onTableChange: (criteria: CriteriaWithPagination<OtelCollector>) => void;
}

const getHostName = (collector: OtelCollector): string =>
  (collector.non_identifying_attributes?.['elastic.display.name'] as string) ?? collector.id;

const getConfigName = (collector: OtelCollector): string | undefined =>
  collector.non_identifying_attributes?.['config.name'] as string | undefined;

const SIGNAL_VIS_COLOR_KEYS: Record<string, [VisColorKey, VisColorKey]> = {
  logs: ['euiColorVisBehindText9', 'euiColorVisText9'],
  metrics: ['euiColorVisBehindText1', 'euiColorVisText1'],
  traces: ['euiColorVisBehindText3', 'euiColorVisText3'],
};

export const CollectorsTable: React.FC<CollectorsTableProps> = ({
  collectors,
  isLoading,
  totalCount,
  pageIndex,
  pageSize,
  onTableChange,
}) => {
  const { getHref } = useLink();
  const { euiTheme } = useEuiTheme();

  const columns: Array<EuiBasicTableColumn<OtelCollector>> = useMemo(() => {
    const getSignalBadgeColor = (signal: string): [string, string] => {
      const entry = SIGNAL_VIS_COLOR_KEYS[signal];
      if (!entry) return ['hollow', 'default'];
      return [euiTheme.colors.vis[entry[0]], euiTheme.colors.vis[entry[1]]];
    };

    return [
      {
        field: 'id',
        name: i18n.translate('xpack.fleet.collectors.table.hostNameColumn', {
          defaultMessage: 'Host Name',
        }),
        width: '185px',
        render: (_: string, collector: OtelCollector) => {
          return (
            <EuiFlexGroup gutterSize="none" direction="column">
              <EuiFlexItem grow={false}>
                <EuiLink href={getHref('agent_details', { agentId: collector.id })}>
                  {getHostName(collector)}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <Tags tags={collector.tags ?? []} color="subdued" size="xs" />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'non_identifying_attributes',
        name: i18n.translate('xpack.fleet.collectors.table.configurationColumn', {
          defaultMessage: 'Configuration',
        }),
        render: (_: unknown, collector: OtelCollector) => getConfigName(collector) ?? '-',
      },
      {
        field: 'identifying_attributes',
        name: i18n.translate('xpack.fleet.collectors.table.versionColumn', {
          defaultMessage: 'Version',
        }),
        // TODO not implemmented yet, waiting for backend to populate the field
        render: (_: unknown, collector: OtelCollector) => <EuiBadge>TODO</EuiBadge>,
      },
      {
        field: 'signals',
        name: i18n.translate('xpack.fleet.collectors.table.signalColumn', {
          defaultMessage: 'Signal',
        }),
        width: '190px',
        render: (signals: string[] | undefined) => {
          if (!signals?.length) return '—';
          return (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {signals.map((signal) => {
                const color = getSignalBadgeColor(signal);

                return (
                  <EuiFlexItem grow={false} key={signal}>
                    <EuiBadge
                      color={color[0]}
                      css={css`
                        color: ${color[1]};
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
        field: 'non_identifying_attributes',
        name: i18n.translate('xpack.fleet.collectors.table.alertsColumn', {
          defaultMessage: 'Alerts',
        }),
        width: '100px',
        // TODO not implemmented yet, waiting for backend to populate the field
        render: (_: unknown, collector: OtelCollector) => '-',
      },
      {
        field: 'enrolled_at',
        name: i18n.translate('xpack.fleet.collectors.table.seenColumn', {
          defaultMessage: 'Seen',
        }),
        width: '180px',
        render: (_: string, collector: OtelCollector) => (
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  <FormattedDate
                    value={collector.enrolled_at}
                    year="numeric"
                    month="short"
                    day="2-digit"
                    hour="numeric"
                    minute="numeric"
                  />
                }
              >
                <EuiText size="xs" color="subdued" tabIndex={0}>
                  <EuiIcon type="clock" size="s" aria-hidden={true} />{' '}
                  <FormattedMessage
                    id="xpack.fleet.collectors.table.firstSeen"
                    defaultMessage="First: {date}"
                    values={{ date: <FormattedRelative value={collector.enrolled_at} /> }}
                  />
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {collector.last_checkin ? (
                <EuiToolTip
                  content={
                    <FormattedDate
                      value={collector.last_checkin}
                      year="numeric"
                      month="short"
                      day="2-digit"
                      hour="2-digit"
                      minute="2-digit"
                    />
                  }
                >
                  <EuiText size="xs" color="subdued" tabIndex={0}>
                    <EuiIcon type="refresh" size="s" aria-hidden={true} />{' '}
                    <FormattedMessage
                      id="xpack.fleet.collectors.table.lastSeen"
                      defaultMessage="Last: {date}"
                      values={{ date: <FormattedRelative value={collector.last_checkin} /> }}
                    />
                  </EuiText>
                </EuiToolTip>
              ) : (
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.fleet.collectors.table.lastSeenNever"
                    defaultMessage="Last: —"
                  />
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        name: i18n.translate('xpack.fleet.collectors.table.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        width: '100px',
        actions: [
          {
            name: i18n.translate('xpack.fleet.collectors.table.viewDetailsAction', {
              defaultMessage: 'View details',
            }),
            description: i18n.translate('xpack.fleet.collectors.table.viewDetailsDescription', {
              defaultMessage: 'View collector details',
            }),
            type: 'icon',
            icon: 'inspect',
            href: ({ id }: OtelCollector) => getHref('agent_details', { agentId: id }),
          },
        ],
      },
    ];
  }, [getHref, euiTheme.colors.vis]);

  return (
    <EuiBasicTable<OtelCollector>
      data-test-subj="fleetCollectorsTable"
      tableCaption={i18n.translate('xpack.fleet.collectors.table.caption', {
        defaultMessage: 'OTel collectors',
      })}
      loading={isLoading}
      items={collectors}
      itemId="id"
      columns={columns}
      pagination={{
        pageIndex,
        pageSize,
        totalItemCount: totalCount,
        pageSizeOptions: [10, 20, 50],
      }}
      onChange={onTableChange}
    />
  );
};
