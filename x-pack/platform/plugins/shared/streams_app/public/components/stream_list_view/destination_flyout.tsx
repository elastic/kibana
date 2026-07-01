/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  LineAnnotation,
  AnnotationDomainType,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';

const CHART_HEIGHT = 200;

interface AttachedAsset {
  title: string;
  type: 'Configuration' | 'Dashboard' | 'Rule' | 'Visualization';
}

const ATTACHED_ASSETS: AttachedAsset[] = [
  { title: 'sttream-logs-msql', type: 'Configuration' },
  { title: 'Revenue Attribution b...', type: 'Dashboard' },
  { title: 'Customer Behavior In...', type: 'Dashboard' },
  { title: 'Database Performanc...', type: 'Dashboard' },
  { title: 'Payment Failures by R...', type: 'Dashboard' },
  { title: 'Service Health \u2013 Ecom...', type: 'Dashboard' },
  { title: 'Rule: Log Threshold R...', type: 'Rule' },
  { title: 'Cluster Overview', type: 'Dashboard' },
  { title: 'Average Uptime [Audi...', type: 'Visualization' },
  { title: 'Rule: Log Threshold R...', type: 'Rule' },
];

const ASSET_TYPE_ICON: Record<AttachedAsset['type'], string> = {
  Configuration: 'document',
  Dashboard: 'dashboardApp',
  Rule: 'bell',
  Visualization: 'visualizeApp',
};

interface FailureReason {
  label: string;
  count: number;
  // Maps to severity colors in the design (danger > risk > warning).
  color: 'danger' | 'risk' | 'warning';
  ratio: number;
}

const TOP_FAILURE_REASONS: FailureReason[] = [
  { label: 'mapping_exception', count: 423, color: 'danger', ratio: 1 },
  { label: 'json_parse error', count: 98, color: 'risk', ratio: 0.52 },
  { label: 'timestamp_mismatch', count: 32, color: 'warning', ratio: 0.2 },
];

// Mocked, evenly-distributed bar chart data with a ramp at the end to roughly
// mirror the design mockup.
const CHART_DATA = Array.from({ length: 24 }, (_, hour) => {
  const base = 2000 + Math.round(Math.sin(hour / 2) * 400);
  const ramp = hour > 16 ? (hour - 16) * 280 : 0;
  return { x: hour, y: base + ramp };
});

const ALERT_ANNOTATIONS = [{ dataValue: 9 }, { dataValue: 15 }];

function SectionPanel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {subtitle ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {subtitle}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem />
        {action ? <EuiFlexItem grow={false}>{action}</EuiFlexItem> : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {children}
    </EuiPanel>
  );
}

function Stat({
  label,
  value,
  unit,
  delta,
  valueColor,
  deltaColor = 'success',
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  valueColor?: 'success' | 'danger' | 'warning';
  deltaColor?: 'success' | 'danger' | 'subdued';
}) {
  const { euiTheme } = useEuiTheme();
  const colorForValue =
    valueColor === 'success'
      ? euiTheme.colors.textSuccess
      : valueColor === 'danger'
      ? euiTheme.colors.textDanger
      : valueColor === 'warning'
      ? euiTheme.colors.textWarning
      : undefined;
  return (
    <EuiFlexItem
      className={css`
        min-width: 96px;
      `}
    >
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="xs" alignItems="baseline" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <span
              className={css`
                white-space: nowrap;
                ${colorForValue ? `color: ${colorForValue};` : ''}
              `}
            >
              {value}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        {unit ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {unit}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {delta ? (
        <EuiText size="xs" color={deltaColor}>
          {delta}
        </EuiText>
      ) : null}
    </EuiFlexItem>
  );
}

const TABS = [
  {
    id: 'overview',
    label: i18n.translate('xpack.streams.destinationFlyout.tab.overview', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: 'quality',
    label: i18n.translate('xpack.streams.destinationFlyout.tab.quality', {
      defaultMessage: 'Quality',
    }),
  },
  {
    id: 'retention',
    label: i18n.translate('xpack.streams.destinationFlyout.tab.retention', {
      defaultMessage: 'Retention',
    }),
  },
  {
    id: 'routing',
    label: i18n.translate('xpack.streams.destinationFlyout.tab.routing', {
      defaultMessage: 'Routing',
    }),
  },
  {
    id: 'attachments',
    label: i18n.translate('xpack.streams.destinationFlyout.tab.attachments', {
      defaultMessage: 'Attachments',
    }),
  },
];

const METRIC_OPTIONS = [
  {
    id: 'documents',
    label: i18n.translate('xpack.streams.destinationFlyout.metric.documents', {
      defaultMessage: 'Documents',
    }),
  },
  {
    id: 'ingestion',
    label: i18n.translate('xpack.streams.destinationFlyout.metric.ingestion', {
      defaultMessage: 'Ingestion',
    }),
  },
  {
    id: 'storage',
    label: i18n.translate('xpack.streams.destinationFlyout.metric.storage', {
      defaultMessage: 'Storage',
    }),
  },
];

function AboutPanel() {
  return (
    <SectionPanel
      title={i18n.translate('xpack.streams.destinationFlyout.aboutTitle', {
        defaultMessage: 'About this stream',
      })}
    >
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.streams.destinationFlyout.aboutDescription', {
          defaultMessage:
            'Beats-based log data from various sources. Configured for lightweight log shipping...',
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiLink>
        {i18n.translate('xpack.streams.destinationFlyout.readMore', {
          defaultMessage: 'Read more',
        })}
      </EuiLink>
    </SectionPanel>
  );
}

function AttachedAssetsPanel() {
  const { euiTheme } = useEuiTheme();
  return (
    <SectionPanel
      title={i18n.translate('xpack.streams.destinationFlyout.attachedAssetsTitle', {
        defaultMessage: 'Attached assets',
      })}
      action={
        <EuiLink>
          {i18n.translate('xpack.streams.destinationFlyout.viewAll', {
            defaultMessage: 'View all ({count})',
            values: { count: 20 },
          })}
        </EuiLink>
      }
    >
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.destinationFlyout.assetTitleColumn', {
                defaultMessage: 'Title',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 120 }}>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.destinationFlyout.assetTypeColumn', {
                defaultMessage: 'Type',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      {ATTACHED_ASSETS.map((asset, index) => (
        <EuiFlexGroup
          key={`${asset.title}-${index}`}
          gutterSize="none"
          responsive={false}
          alignItems="center"
          className={css`
            padding: ${euiTheme.size.xs} 0;
          `}
        >
          <EuiFlexItem
            className={css`
              min-width: 0;
            `}
          >
            <EuiLink
              className={css`
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}
            >
              {asset.title}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 120 }}>
            <EuiBadge color="hollow" iconType={ASSET_TYPE_ICON[asset.type]}>
              {asset.type}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </SectionPanel>
  );
}

function DependencyNode({
  title,
  subtitle,
  meta,
  icon,
  health,
  healthBadge,
  routingIcon = false,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  icon: string;
  health?: string;
  healthBadge?: string;
  routingIcon?: boolean;
  compact?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      {routingIcon ? (
        <EuiFlexItem grow={false}>
          <EuiPanel
            hasShadow={false}
            paddingSize="xs"
            color="primary"
            className={css`
              display: flex;
            `}
          >
            <EuiIcon type="branch" size="s" color="primary" />
          </EuiPanel>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiPanel
          hasShadow={false}
          hasBorder
          paddingSize="s"
          className={css`
            background-color: ${euiTheme.colors.emptyShade};
            width: ${compact ? 56 : 200}px;
          `}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} />
            </EuiFlexItem>
            {!compact ? (
              <EuiFlexItem
                className={css`
                  min-width: 0;
                `}
              >
                <EuiText
                  size="s"
                  className={css`
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  `}
                >
                  <strong>{title}</strong>
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          {subtitle ? (
            <EuiText size="xs" color="subdued">
              {subtitle}
            </EuiText>
          ) : null}
          {meta || health || healthBadge ? (
            <>
              <EuiSpacer size="xs" />
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                responsive={false}
                justifyContent="spaceBetween"
                wrap={false}
              >
                {meta ? (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {meta}
                    </EuiText>
                  </EuiFlexItem>
                ) : null}
                {health ? (
                  <EuiFlexItem grow={false}>
                    <EuiHealth color="success">{health}</EuiHealth>
                  </EuiFlexItem>
                ) : null}
                {healthBadge ? (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="success">{healthBadge}</EuiBadge>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </>
          ) : null}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function DependencyMapPanel() {
  const { euiTheme } = useEuiTheme();
  return (
    <SectionPanel
      title={i18n.translate('xpack.streams.destinationFlyout.dependencyMapTitle', {
        defaultMessage: 'Dependency map',
      })}
      action={
        <EuiLink>
          {i18n.translate('xpack.streams.destinationFlyout.viewInCanvas', {
            defaultMessage: 'View in canvas',
          })}
        </EuiLink>
      }
    >
      <EuiPanel
        hasShadow={false}
        color="subdued"
        paddingSize="l"
        className={css`
          background-image: radial-gradient(${euiTheme.colors.lightShade} 1px, transparent 1px);
          background-size: 16px 16px;
          overflow-x: auto;
        `}
      >
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          wrap={false}
          className={css`
            width: max-content;
          `}
        >
          <EuiFlexItem grow={false}>
            <DependencyNode
              title="AWS CloudWatch"
              subtitle={i18n.translate('xpack.streams.destinationFlyout.sourceSubtitle', {
                defaultMessage: 'Logs \u00b7 Push via Firehose',
              })}
              meta="11.9k/s"
              icon="logoAWS"
              health={i18n.translate('xpack.streams.destinationFlyout.healthy', {
                defaultMessage: 'Healthy',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sortRight" color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="column"
              gutterSize="xs"
              alignItems="center"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {'{{PipelineName}}'}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DependencyNode title="" icon="logstashIf" compact />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sortRight" color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DependencyNode
              title="Destination name"
              meta={'8.1k eps \u00b7 175ms'}
              icon="package"
              routingIcon
              healthBadge={i18n.translate('xpack.streams.destinationFlyout.good', {
                defaultMessage: 'Good',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </SectionPanel>
  );
}

function DatasetQualityPanel() {
  const { euiTheme } = useEuiTheme();
  const severityColor = (color: FailureReason['color']) => euiTheme.colors.severity[color];
  return (
    <SectionPanel
      title={i18n.translate('xpack.streams.destinationFlyout.datasetQualityTitle', {
        defaultMessage: 'Dataset quality',
      })}
      action={
        <EuiLink>
          {i18n.translate('xpack.streams.destinationFlyout.viewAllShort', {
            defaultMessage: 'View all',
          })}
        </EuiLink>
      }
    >
      <EuiFlexGroup gutterSize="l" responsive wrap alignItems="flexStart">
        <EuiFlexItem grow={1}>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <Stat
              label={i18n.translate('xpack.streams.destinationFlyout.degradedDocs', {
                defaultMessage: 'Degraded docs',
              })}
              value="0.01%"
              valueColor="success"
              delta={i18n.translate('xpack.streams.destinationFlyout.improving', {
                defaultMessage: 'Improving',
              })}
            />
            <Stat
              label={i18n.translate('xpack.streams.destinationFlyout.failedDocs', {
                defaultMessage: 'Failed docs',
              })}
              value="0.2%"
              delta={i18n.translate('xpack.streams.destinationFlyout.stable', {
                defaultMessage: 'Stable',
              })}
              deltaColor="subdued"
            />
            <Stat
              label={i18n.translate('xpack.streams.destinationFlyout.ignoredFields', {
                defaultMessage: 'Ignored fields',
              })}
              value="10,892"
              delta={i18n.translate('xpack.streams.destinationFlyout.ignoredDelta', {
                defaultMessage: '+300 this week',
              })}
              deltaColor="danger"
            />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.destinationFlyout.topFailureReasons', {
                defaultMessage: 'Top failure reasons',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="xs" />
          {TOP_FAILURE_REASONS.map((reason, index) => (
            <EuiFlexGroup
              key={reason.label}
              gutterSize="s"
              alignItems="center"
              responsive={false}
              className={css`
                padding: ${euiTheme.size.xs} 0;
                ${index < TOP_FAILURE_REASONS.length - 1
                  ? `border-bottom: ${euiTheme.border.thin};`
                  : ''}
              `}
            >
              <EuiFlexItem>
                <EuiText
                  size="xs"
                  className={css`
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  `}
                >
                  {reason.label}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: 100 }}>
                <div
                  className={css`
                    height: 8px;
                    border-radius: ${euiTheme.border.radius.medium};
                    background-color: ${euiTheme.colors.lightestShade};
                  `}
                >
                  <div
                    className={css`
                      height: 8px;
                      width: ${reason.ratio * 100}%;
                      border-radius: ${euiTheme.border.radius.medium};
                      background-color: ${severityColor(reason.color)};
                    `}
                  />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: 28 }}>
                <EuiText size="xs" textAlign="right">
                  {reason.count}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </SectionPanel>
  );
}

function ChartPanel() {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const [selectedMetric, setSelectedMetric] = useState('documents');

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.streams.destinationFlyout.metricLegend', {
              defaultMessage: 'Select metric',
            })}
            options={METRIC_OPTIONS}
            idSelected={selectedMetric}
            onChange={setSelectedMetric}
            buttonSize="compressed"
          />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="bell">
            {i18n.translate('xpack.streams.destinationFlyout.alerts', {
              defaultMessage: 'Alerts',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="arrowDown" iconSide="right" size="s" color="text">
            {i18n.translate('xpack.streams.destinationFlyout.lastDuration', {
              defaultMessage: 'Last 24 hours',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            display="base"
            color="primary"
            size="s"
            aria-label={i18n.translate('xpack.streams.destinationFlyout.refresh', {
              defaultMessage: 'Refresh',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <Chart size={{ width: '100%', height: CHART_HEIGHT }}>
        <Settings
          showLegend={false}
          baseTheme={chartBaseTheme}
          locale={i18n.getLocale()}
          theme={{ barSeriesStyle: { rect: { widthRatio: 0.7 } } }}
        />
        <LineAnnotation
          id="alerts"
          domainType={AnnotationDomainType.XDomain}
          dataValues={ALERT_ANNOTATIONS}
          style={{
            line: { stroke: euiTheme.colors.danger, strokeWidth: 2, opacity: 1 },
          }}
          marker={<EuiIcon type="warning" color={euiTheme.colors.danger} size="s" />}
          markerPosition={Position.Top}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          tickFormat={(value) => `${String(value).padStart(2, '0')}:00`}
          gridLine={{ visible: false }}
        />
        <Axis
          id="left"
          position={Position.Left}
          ticks={5}
          tickFormat={(value) => `${(value / 1000).toFixed(1)}k`}
        />
        <BarSeries
          id="documents"
          name={i18n.translate('xpack.streams.destinationFlyout.documentsSeries', {
            defaultMessage: 'Documents',
          })}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={CHART_DATA}
          color={euiTheme.colors.vis.euiColorVis0}
        />
      </Chart>

      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiHealth color={euiTheme.colors.vis.euiColorVis0}>
            {i18n.translate('xpack.streams.destinationFlyout.legendDocuments', {
              defaultMessage: 'Documents',
            })}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="subdued">
            {i18n.translate('xpack.streams.destinationFlyout.legendDegraded', {
              defaultMessage: 'Degraded docs',
            })}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="subdued">
            {i18n.translate('xpack.streams.destinationFlyout.legendFailures', {
              defaultMessage: 'Failures',
            })}
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="m" />

      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        <Stat
          label={i18n.translate('xpack.streams.destinationFlyout.docsTotal', {
            defaultMessage: 'Docs total',
          })}
          value="667,123"
          unit={i18n.translate('xpack.streams.destinationFlyout.totalDocs', {
            defaultMessage: 'total docs',
          })}
          delta={i18n.translate('xpack.streams.destinationFlyout.deltaVsLastWeek', {
            defaultMessage: '\u2191 +10% vs. last week',
          })}
        />
        <Stat
          label={i18n.translate('xpack.streams.destinationFlyout.docsInTimeRange', {
            defaultMessage: 'Docs in time range',
          })}
          value="12,000"
          unit={i18n.translate('xpack.streams.destinationFlyout.docs', {
            defaultMessage: 'docs',
          })}
          delta={i18n.translate('xpack.streams.destinationFlyout.deltaVsLastWeek', {
            defaultMessage: '\u2191 +10% vs. last week',
          })}
        />
        <Stat
          label={i18n.translate('xpack.streams.destinationFlyout.peakIngestRate', {
            defaultMessage: 'Peak ingest rate',
          })}
          value="1,231"
          unit={i18n.translate('xpack.streams.destinationFlyout.docsPerSec', {
            defaultMessage: 'docs/sec',
          })}
          delta={i18n.translate('xpack.streams.destinationFlyout.avgPerDay', {
            defaultMessage: 'avg. 24.000/day',
          })}
          deltaColor="subdued"
        />
        <Stat
          label={i18n.translate('xpack.streams.destinationFlyout.storageSize', {
            defaultMessage: 'Storage size',
          })}
          value="14.2"
          unit={i18n.translate('xpack.streams.destinationFlyout.gb', {
            defaultMessage: 'GB',
          })}
          delta={i18n.translate('xpack.streams.destinationFlyout.deltaStorage', {
            defaultMessage: '\u2191 +2% vs. last week',
          })}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function DestinationFlyout({
  destinationName,
  onClose,
}: {
  destinationName: string;
  onClose: () => void;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'destinationFlyoutTitle' });
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <EuiFlyout
      size="l"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="destinationFlyout"
    >
      <EuiFlyoutHeader
        hasBorder
        className={css`
          && {
            padding-bottom: 0;
          }
        `}
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={titleId}>{destinationName}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.streams.destinationFlyout.viewDestination', {
                defaultMessage: 'View destination',
              })}
            >
              <EuiButtonIcon
                iconType="fullScreen"
                display="base"
                size="s"
                color="text"
                data-test-subj="destinationFlyoutViewDestinationButton"
                aria-label={i18n.translate('xpack.streams.destinationFlyout.viewDestination', {
                  defaultMessage: 'View destination',
                })}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="discoverApp"
              size="s"
              color="text"
              data-test-subj="destinationFlyoutDiscoverButton"
            >
              {i18n.translate('xpack.streams.destinationFlyout.openInDiscover', {
                defaultMessage: 'Open in Discover',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTabs bottomBorder={false}>
          {TABS.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={tab.id === selectedTab}
              onClick={() => setSelectedTab(tab.id)}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="m" alignItems="flexStart">
          {/* Left lane */}
          <EuiFlexItem
            grow={2}
            className={css`
              min-width: 0;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <AboutPanel />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AttachedAssetsPanel />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Center lane */}
          <EuiFlexItem
            grow={3}
            className={css`
              min-width: 0;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <ChartPanel />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DependencyMapPanel />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DatasetQualityPanel />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
