/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
  type Criteria,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Axis, Chart, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import {
  AlertsNotConfiguredPrompt,
  formatIncidentTick,
  useEntityFlyoutServices,
} from '@kbn/entity-centric-lab-flyout';
import type { AlertRow, AlertsTabData } from '@kbn/entity-centric-lab-flyout';

export interface StreamsElasticOnAlertsTabProps {
  readonly alerts: AlertsTabData;
  readonly entityName: string;
  readonly onOpenAlertRow: (row: AlertRow) => void;
  readonly onOpenRuleRow: (row: AlertRow) => void;
}

/**
 * ElasticOn / Phase 1 alerts tab — lives in Streams so rule-name clicks and
 * child flyouts stay in the same bundle as {@link AllEntitiesViewInner}.
 */
export const StreamsElasticOnAlertsTab = ({
  alerts,
  entityName,
  onOpenAlertRow,
  onOpenRuleRow,
}: StreamsElasticOnAlertsTabProps) => {
  const { euiTheme } = useEuiTheme();
  const { charts } = useEntityFlyoutServices();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const openAlertRow = useCallback(
    (row: AlertRow) => {
      onOpenAlertRow(row);
    },
    [onOpenAlertRow]
  );

  const openRuleRow = useCallback(
    (row: AlertRow) => {
      onOpenRuleRow(row);
    },
    [onOpenRuleRow]
  );

  const pageOfItems = useMemo(
    () => alerts.details.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [alerts.details, pageIndex, pageSize]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<AlertRow>>>(
    () => [
      {
        field: 'id',
        name: '',
        width: '40px',
        render: (_id: string, row: AlertRow) => (
          <EuiToolTip
            content={i18n.translate('entityCentricLabFlyout.flyout.alerts.expandAlertTooltip', {
              defaultMessage: 'View alert details',
            })}
          >
            <EuiButtonIcon
              iconType="expand"
              color="text"
              size="xs"
              aria-label={i18n.translate(
                'entityCentricLabFlyout.flyout.alerts.expandAlertAriaLabel',
                {
                  defaultMessage: 'View alert details for {ruleName}',
                  values: { ruleName: row.ruleName },
                }
              )}
              onClick={() => openAlertRow(row)}
              data-test-subj="streamsElasticOnAlertsExpandButton"
            />
          </EuiToolTip>
        ),
      },
      {
        field: 'status',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.status', {
          defaultMessage: 'Status',
        }),
        width: '100px',
        render: (status: AlertRow['status']) => <EuiBadge color="danger">{status}</EuiBadge>,
      },
      {
        field: 'triggeredAt',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.triggered', {
          defaultMessage: 'Triggered',
        }),
        sortable: true,
        render: (triggeredAt: string) => <EuiText size="s">{triggeredAt}</EuiText>,
      },
      {
        field: 'ruleName',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.ruleName', {
          defaultMessage: 'Rule name',
        }),
        render: (ruleName: string, row: AlertRow) => (
          <EuiButtonEmpty
            flush="left"
            size="s"
            color="primary"
            data-test-subj="streamsElasticOnAlertsRuleLink"
            onClick={() => openRuleRow(row)}
          >
            {ruleName}
          </EuiButtonEmpty>
        ),
      },
      {
        field: 'reason',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.reason', {
          defaultMessage: 'Reason',
        }),
        render: (reason: string, row: AlertRow) => (
          <EuiButtonEmpty flush="left" size="s" color="primary" onClick={() => openAlertRow(row)}>
            <EuiText
              size="s"
              css={css`
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              {reason}
            </EuiText>
          </EuiButtonEmpty>
        ),
      },
    ],
    [openAlertRow, openRuleRow]
  );

  const activePercent =
    alerts.totalCount > 0 ? Math.round((alerts.activeCount / alerts.totalCount) * 100) : 0;

  if (alerts.rulesConfigured === false) {
    return <AlertsNotConfiguredPrompt />;
  }

  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false} style={{ minWidth: 220 }}>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiFlexGroup gutterSize="m" responsive={false} alignItems="stretch">
              <EuiFlexItem grow={false}>
                <div
                  aria-hidden
                  css={css`
                    width: 6px;
                    align-self: stretch;
                    background-color: ${euiTheme.colors.danger};
                    border-radius: ${euiTheme.border.radius.small};
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('entityCentricLabFlyout.flyout.alerts.activeAlertsTitle', {
                      defaultMessage: 'Active alerts',
                    })}
                  </h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  {i18n.translate('entityCentricLabFlyout.flyout.alerts.activePercent', {
                    defaultMessage: '{percent}% of {total}',
                    values: { percent: activePercent, total: alerts.totalCount },
                  })}
                </EuiText>
                <EuiSpacer size="m" />
                <EuiText
                  textAlign="right"
                  css={css`
                    color: ${euiTheme.colors.danger};
                    font-weight: ${euiTheme.font.weight.bold};
                    font-size: 36px;
                    line-height: 1;
                  `}
                >
                  {alerts.activeCount}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 260 }}>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate(
                      'entityCentricLabFlyout.flyout.alerts.activeAlertsOverTimeTitle',
                      { defaultMessage: 'Active alerts over time' }
                    )}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('entityCentricLabFlyout.flyout.alerts.overTimeTooltip', {
                    defaultMessage:
                      'Number of active alerts attributed to this entity over the selected time window.',
                  })}
                  position="top"
                  delay="long"
                >
                  <EuiButtonIcon
                    iconType="question"
                    color="text"
                    aria-label={i18n.translate(
                      'entityCentricLabFlyout.flyout.alerts.overTimeTooltipAriaLabel',
                      { defaultMessage: 'Show chart description' }
                    )}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <div style={{ height: 140 }} data-test-subj="entityCentricLabAlertsOverTimeChart">
              <Chart>
                <Settings baseTheme={chartBaseTheme} locale={i18n.getLocale()} showLegend={false} />
                <Axis
                  id="alerts-over-time-x"
                  position={Position.Bottom}
                  tickFormat={(value) => formatIncidentTick(Number(value))}
                />
                <Axis id="alerts-over-time-y" position={Position.Left} />
                <LineSeries
                  id="active-alerts"
                  name="Active alerts"
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="x"
                  yAccessors={['y']}
                  data={alerts.overTime as Array<{ x: number; y: number }>}
                  color={euiTheme.colors.vis.euiColorVis0}
                  timeZone="utc"
                />
              </Chart>
            </div>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('entityCentricLabFlyout.flyout.alerts.detailsTitle', {
              defaultMessage: 'Active alerts details',
            })}
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.translate('entityCentricLabFlyout.flyout.alerts.showingCount', {
            defaultMessage:
              'Showing {start}-{end} of {total} {total, plural, one {Alert} other {Alerts}}',
            values: {
              start: pageIndex * pageSize + 1,
              end: Math.min((pageIndex + 1) * pageSize, alerts.details.length),
              total: alerts.details.length,
            },
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<AlertRow>
          items={pageOfItems}
          columns={columns}
          tableCaption={i18n.translate('entityCentricLabFlyout.flyout.alerts.detailsTableCaption', {
            defaultMessage: 'Active alerts details',
          })}
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount: alerts.details.length,
            pageSizeOptions: [10, 25, 50],
          }}
          onChange={({ page }: Criteria<AlertRow>) => {
            if (page) {
              setPagination({ pageIndex: page.index, pageSize: page.size });
            }
          }}
          data-test-subj="streamsElasticOnAlertsDetailsTable"
        />
      </EuiPanel>
    </>
  );
};
