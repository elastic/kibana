/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiCard,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useKibana } from '../../../hooks/use_kibana';
import {
  getFakeIntegration,
  type AlertRuleAsset,
  type DashboardAsset,
  type DataStreamAsset,
  type DataStreamQuality,
  type FakeIntegration,
  type MlAsset,
  type ResourceType,
  type SloTemplateAsset,
} from './fake_integrations';
import {
  enableRecommendedAsset,
  isRecommendedAssetEnabled,
  useIntegrationAssetsVersion,
} from './integration_assets_store';
import {
  BrowseMoreIntegrationsBanner,
  IntegrationStatRow,
  StarToggleButton,
} from './integration_shared';

const QUALITY_META: Record<DataStreamQuality, { color: string; label: string }> = {
  good: {
    color: 'success',
    label: i18n.translate('xpack.streams.entityCentricLab.integrations.quality.good', {
      defaultMessage: 'Good',
    }),
  },
  degraded: {
    color: 'warning',
    label: i18n.translate('xpack.streams.entityCentricLab.integrations.quality.degraded', {
      defaultMessage: 'Degraded',
    }),
  },
  poor: {
    color: 'danger',
    label: i18n.translate('xpack.streams.entityCentricLab.integrations.quality.poor', {
      defaultMessage: 'Poor',
    }),
  },
};

const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  blog: i18n.translate('xpack.streams.entityCentricLab.integrations.resourceType.blog', {
    defaultMessage: 'Blog post',
  }),
  video: i18n.translate('xpack.streams.entityCentricLab.integrations.resourceType.video', {
    defaultMessage: 'Video',
  }),
  event: i18n.translate('xpack.streams.entityCentricLab.integrations.resourceType.event', {
    defaultMessage: 'Upcoming event',
  }),
  documentation: i18n.translate(
    'xpack.streams.entityCentricLab.integrations.resourceType.documentation',
    { defaultMessage: 'Documentation' }
  ),
};

const RESOURCE_TYPE_ICON: Record<ResourceType, string> = {
  blog: 'documentEdit',
  video: 'playFilled',
  event: 'calendar',
  documentation: 'documentation',
};

/** Section wrapper: title + count + optional right-aligned "Open in…" link. */
const SectionPanel = ({
  title,
  count,
  action,
  children,
  dataTestSubj,
}: {
  title: string;
  count?: number;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  dataTestSubj?: string;
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'integrationSection' });
  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj={dataTestSubj}>
      <EuiAccordion
        id={accordionId}
        initialIsOpen
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {typeof count === 'number' ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{count}</EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        }
        extraAction={
          action ? (
            <EuiLink onClick={action.onClick} external={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>{action.label}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="popout" size="s" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiLink>
          ) : undefined
        }
      >
        <EuiSpacer size="m" />
        {children}
      </EuiAccordion>
    </EuiPanel>
  );
};

const DEFAULT_PAGINATION = { initialPageSize: 5, pageSizeOptions: [5, 10, 25] };

const DashboardsSection = ({
  integration,
  onOpenDashboards,
}: {
  integration: FakeIntegration;
  onOpenDashboards: () => void;
}) => {
  const columns: Array<EuiBasicTableColumn<DashboardAsset>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.dashboards.name', {
        defaultMessage: 'Name',
      }),
      render: (name: string) => <EuiLink onClick={onOpenDashboards}>{name}</EuiLink>,
    },
    {
      field: 'description',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.dashboards.description', {
        defaultMessage: 'Description',
      }),
    },
    {
      field: 'aiFinding',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.dashboards.aiFinding', {
        defaultMessage: 'AI summary of recent findings',
      }),
      render: (finding: string) => (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sparkles" size="s" color="accent" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {finding}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];
  return (
    <SectionPanel
      title={i18n.translate('xpack.streams.entityCentricLab.integrations.dashboards.title', {
        defaultMessage: 'Dashboards',
      })}
      count={integration.stats.dashboards}
      action={{
        label: i18n.translate('xpack.streams.entityCentricLab.integrations.dashboards.open', {
          defaultMessage: 'Open in Dashboards',
        }),
        onClick: onOpenDashboards,
      }}
      dataTestSubj="entityCentricLabIntegrationDashboards"
    >
      <EuiInMemoryTable
        items={[...integration.dashboards]}
        columns={columns}
        pagination={DEFAULT_PAGINATION}
      />
    </SectionPanel>
  );
};

// Data stream names encode their signal type (`logs-*`, `metrics-*`,
// `traces-*`), so the Discover action reflects what the stream actually holds.
const getViewInDiscoverLabel = (name: string): string => {
  if (name.startsWith('metrics-')) {
    return i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.viewMetrics', {
      defaultMessage: 'View metrics in Discover',
    });
  }
  if (name.startsWith('traces-')) {
    return i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.viewTraces', {
      defaultMessage: 'View traces in Discover',
    });
  }
  if (name.startsWith('logs-')) {
    return i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.viewLogs', {
      defaultMessage: 'View logs in Discover',
    });
  }
  return i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.viewInDiscover', {
    defaultMessage: 'View in Discover',
  });
};

const DataStreamsSection = ({
  integration,
  onOpenDiscover,
}: {
  integration: FakeIntegration;
  onOpenDiscover: () => void;
}) => {
  const columns: Array<EuiBasicTableColumn<DataStreamAsset>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.name', {
        defaultMessage: 'Name',
      }),
      render: (name: string) => <EuiLink onClick={onOpenDiscover}>{name}</EuiLink>,
    },
    {
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.actions', {
        defaultMessage: 'Actions',
      }),
      render: (dataStream: DataStreamAsset) => (
        <EuiLink onClick={onOpenDiscover}>{getViewInDiscoverLabel(dataStream.name)}</EuiLink>
      ),
    },
    {
      field: 'sizeLabel',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.size', {
        defaultMessage: 'Data',
      }),
    },
    {
      field: 'quality',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.quality', {
        defaultMessage: 'Quality',
      }),
      render: (quality: DataStreamQuality) => (
        <EuiHealth color={QUALITY_META[quality].color}>{QUALITY_META[quality].label}</EuiHealth>
      ),
    },
    {
      field: 'lastStructureLabel',
      name: i18n.translate(
        'xpack.streams.entityCentricLab.integrations.dataStreams.lastStructure',
        {
          defaultMessage: 'Last activity',
        }
      ),
    },
  ];
  return (
    <SectionPanel
      title={i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.title', {
        defaultMessage: 'Data streams',
      })}
      count={integration.stats.dataStreams}
      action={{
        label: i18n.translate('xpack.streams.entityCentricLab.integrations.dataStreams.open', {
          defaultMessage: 'Open in Discover',
        }),
        onClick: onOpenDiscover,
      }}
      dataTestSubj="entityCentricLabIntegrationDataStreams"
    >
      <EuiInMemoryTable
        items={[...integration.dataStreams]}
        columns={columns}
        pagination={DEFAULT_PAGINATION}
      />
    </SectionPanel>
  );
};

type AssetTab = 'enabled' | 'recommended';

const useEnabledRecommendedTabs = () => {
  const [tab, setTab] = useState<AssetTab>('enabled');
  return { tab, setTab };
};

const EnabledRecommendedToggle = ({
  tab,
  setTab,
  enabledCount,
  recommendedCount,
  idPrefix,
}: {
  tab: AssetTab;
  setTab: (tab: AssetTab) => void;
  enabledCount: number;
  recommendedCount: number;
  idPrefix: string;
}) => (
  <EuiButtonGroup
    legend={i18n.translate('xpack.streams.entityCentricLab.integrations.assetTabsLegend', {
      defaultMessage: 'Show enabled or recommended assets',
    })}
    options={[
      {
        id: `${idPrefix}-enabled`,
        label: i18n.translate('xpack.streams.entityCentricLab.integrations.tab.enabled', {
          defaultMessage: 'Enabled ({count})',
          values: { count: enabledCount },
        }),
      },
      {
        id: `${idPrefix}-recommended`,
        label: i18n.translate('xpack.streams.entityCentricLab.integrations.tab.recommended', {
          defaultMessage: 'Recommended ({count})',
          values: { count: recommendedCount },
        }),
      },
    ]}
    idSelected={`${idPrefix}-${tab}`}
    onChange={(id) => setTab(id.endsWith('recommended') ? 'recommended' : 'enabled')}
    buttonSize="compressed"
  />
);

type CellSeverity = 'danger' | 'warning' | 'success';

// y-values (0..8 scale, higher = taller) for the three trend shapes in the
// design: danger climbs steeply, warning drifts up, success stays flat.
const SPARK_TRENDS: Record<CellSeverity, readonly number[]> = {
  danger: [1, 1, 2, 4, 6, 8],
  warning: [3, 3, 4, 4, 5, 5],
  success: [3, 3, 3, 3, 3, 3],
};

const Sparkline = ({ color, severity }: { color: string; severity: CellSeverity }) => {
  const values = SPARK_TRENDS[severity];
  const width = 72;
  const height = 20;
  const pad = 2;
  const max = 8;
  const stepX = (width - pad * 2) / (values.length - 1);
  const toY = (value: number) => pad + ((max - value) / max) * (height - pad * 2);
  const line = values.map((value, i) => `${pad + i * stepX},${toY(value)}`).join(' ');
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {severity === 'danger' && <polygon points={area} fill={color} fillOpacity={0.15} />}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// The design's trailing metric column: a colour-coded count pill next to a
// matching sparkline (used for both "Active alerts" and "Breaching SLOs").
const CountTrendCell = ({ count, severity }: { count: number; severity: CellSeverity }) => {
  const { euiTheme } = useEuiTheme();
  const palette = {
    danger: { bg: euiTheme.colors.backgroundBaseDanger, text: euiTheme.colors.textDanger },
    warning: { bg: euiTheme.colors.backgroundBaseWarning, text: euiTheme.colors.textWarning },
    success: { bg: euiTheme.colors.backgroundBaseSuccess, text: euiTheme.colors.textSuccess },
  }[severity];
  const pillClass = css`
    display: inline-block;
    min-width: 24px;
    padding: ${euiTheme.size.xxs} ${euiTheme.size.s};
    text-align: center;
    border-radius: 999px;
    background-color: ${palette.bg};
    color: ${palette.text};
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: 12px;
    line-height: 1.4;
  `;
  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <span className={pillClass}>{count}</span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Sparkline color={palette.text} severity={severity} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// Deterministic pseudo-count so identical tones still show varied "active
// alert" numbers (mock data has no real counts).
const stableHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1_000_000_007;
  }
  return hash;
};

const alertActiveCount = (rule: AlertRuleAsset): number => {
  if (rule.tone === 'danger') return 3 + (stableHash(rule.id) % 6);
  if (rule.tone === 'warning') return 1 + (stableHash(rule.id) % 3);
  return 0;
};

const alertSeverity = (count: number, tone: AlertRuleAsset['tone']): CellSeverity =>
  count === 0 ? 'success' : tone === 'danger' ? 'danger' : 'warning';

const breachingSeverity = (breaching: number): CellSeverity =>
  breaching === 0 ? 'success' : breaching > 2 ? 'danger' : 'warning';

const AlertRulesSection = ({
  integration,
  onOpenAlerts,
}: {
  integration: FakeIntegration;
  onOpenAlerts: () => void;
}) => {
  useIntegrationAssetsVersion();
  const { tab, setTab } = useEnabledRecommendedTabs();

  const enabledRules = useMemo(
    () => [
      ...integration.alertRules.enabled,
      ...integration.alertRules.recommended.filter((rule) =>
        isRecommendedAssetEnabled(integration.id, rule.id)
      ),
    ],
    [integration]
  );
  const recommendedRules = useMemo(
    () =>
      integration.alertRules.recommended.filter(
        (rule) => !isRecommendedAssetEnabled(integration.id, rule.id)
      ),
    [integration]
  );

  const sharedColumns: Array<EuiBasicTableColumn<AlertRuleAsset>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.alerts.name', {
        defaultMessage: 'Alert rule',
      }),
      render: (name: string) => <EuiLink onClick={onOpenAlerts}>{name}</EuiLink>,
    },
    {
      field: 'reason',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.alerts.reason', {
        defaultMessage: 'Reason',
      }),
    },
  ];

  const enabledColumns: Array<EuiBasicTableColumn<AlertRuleAsset>> = [
    ...sharedColumns,
    {
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.alerts.activeAlerts', {
        defaultMessage: 'Active alerts using this rule',
      }),
      width: '260px',
      render: (rule: AlertRuleAsset) => {
        const count = alertActiveCount(rule);
        return <CountTrendCell count={count} severity={alertSeverity(count, rule.tone)} />;
      },
    },
  ];

  const recommendedColumns: Array<EuiBasicTableColumn<AlertRuleAsset>> = [
    ...sharedColumns,
    {
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.alerts.action', {
        defaultMessage: 'Action',
      }),
      width: '110px',
      render: (rule: AlertRuleAsset) => (
        <EuiButton
          size="s"
          onClick={() => enableRecommendedAsset(integration.id, rule.id)}
          data-test-subj={`entityCentricLabEnableAsset-${rule.id}`}
        >
          {i18n.translate('xpack.streams.entityCentricLab.integrations.enable', {
            defaultMessage: 'Enable',
          })}
        </EuiButton>
      ),
    },
  ];

  return (
    <SectionPanel
      title={i18n.translate('xpack.streams.entityCentricLab.integrations.alerts.title', {
        defaultMessage: 'Alert rules',
      })}
      action={{
        label: i18n.translate('xpack.streams.entityCentricLab.integrations.alerts.open', {
          defaultMessage: 'Open in Alerts',
        }),
        onClick: onOpenAlerts,
      }}
      dataTestSubj="entityCentricLabIntegrationAlerts"
    >
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EnabledRecommendedToggle
            tab={tab}
            setTab={setTab}
            enabledCount={enabledRules.length}
            recommendedCount={recommendedRules.length}
            idPrefix={`${integration.id}-alerts`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiInMemoryTable
        items={tab === 'enabled' ? enabledRules : recommendedRules}
        columns={tab === 'enabled' ? enabledColumns : recommendedColumns}
        pagination={DEFAULT_PAGINATION}
      />
    </SectionPanel>
  );
};

const SloTemplatesSection = ({
  integration,
  onOpenSlos,
}: {
  integration: FakeIntegration;
  onOpenSlos: () => void;
}) => {
  useIntegrationAssetsVersion();
  const { tab, setTab } = useEnabledRecommendedTabs();

  const enabledSlos = useMemo(
    () => [
      ...integration.sloTemplates.enabled,
      ...integration.sloTemplates.recommended.filter((slo) =>
        isRecommendedAssetEnabled(integration.id, slo.id)
      ),
    ],
    [integration]
  );
  const recommendedSlos = useMemo(
    () =>
      integration.sloTemplates.recommended.filter(
        (slo) => !isRecommendedAssetEnabled(integration.id, slo.id)
      ),
    [integration]
  );

  const sharedColumns: Array<EuiBasicTableColumn<SloTemplateAsset>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.slos.name', {
        defaultMessage: 'SLO template',
      }),
      render: (name: string) => <EuiLink onClick={onOpenSlos}>{name}</EuiLink>,
    },
    {
      field: 'objective',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.slos.objective', {
        defaultMessage: 'Objective',
      }),
    },
  ];

  const enabledColumns: Array<EuiBasicTableColumn<SloTemplateAsset>> = [
    ...sharedColumns,
    {
      field: 'breaching',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.slos.breaching', {
        defaultMessage: 'Breaching SLOs using this template',
      }),
      width: '260px',
      render: (breaching: number) => (
        <CountTrendCell count={breaching} severity={breachingSeverity(breaching)} />
      ),
    },
  ];

  const recommendedColumns: Array<EuiBasicTableColumn<SloTemplateAsset>> = [
    ...sharedColumns,
    {
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.slos.action', {
        defaultMessage: 'Action',
      }),
      width: '110px',
      render: (slo: SloTemplateAsset) => (
        <EuiButton
          size="s"
          onClick={() => enableRecommendedAsset(integration.id, slo.id)}
          data-test-subj={`entityCentricLabEnableAsset-${slo.id}`}
        >
          {i18n.translate('xpack.streams.entityCentricLab.integrations.enable', {
            defaultMessage: 'Enable',
          })}
        </EuiButton>
      ),
    },
  ];

  return (
    <SectionPanel
      title={i18n.translate('xpack.streams.entityCentricLab.integrations.slos.title', {
        defaultMessage: 'SLO templates',
      })}
      action={{
        label: i18n.translate('xpack.streams.entityCentricLab.integrations.slos.open', {
          defaultMessage: 'Open in SLOs',
        }),
        onClick: onOpenSlos,
      }}
      dataTestSubj="entityCentricLabIntegrationSlos"
    >
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EnabledRecommendedToggle
            tab={tab}
            setTab={setTab}
            enabledCount={enabledSlos.length}
            recommendedCount={recommendedSlos.length}
            idPrefix={`${integration.id}-slos`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiInMemoryTable
        items={tab === 'enabled' ? enabledSlos : recommendedSlos}
        columns={tab === 'enabled' ? enabledColumns : recommendedColumns}
        pagination={DEFAULT_PAGINATION}
      />
    </SectionPanel>
  );
};

const ML_TYPE_ICON: Record<MlAsset['type'], string> = {
  'ML job': 'machineLearningApp',
  'AI skill': 'sparkles',
};

const MlAssetsSection = ({
  integration,
  onOpenMl,
}: {
  integration: FakeIntegration;
  onOpenMl: () => void;
}) => {
  const columns: Array<EuiBasicTableColumn<MlAsset>> = [
    {
      field: 'type',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.ml.type', {
        defaultMessage: 'Type',
      }),
      width: '120px',
      render: (type: MlAsset['type']) => (
        <EuiBadge color="hollow" iconType={ML_TYPE_ICON[type]}>
          {type}
        </EuiBadge>
      ),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.ml.name', {
        defaultMessage: 'Name',
      }),
      render: (name: string) => <EuiLink onClick={onOpenMl}>{name}</EuiLink>,
    },
    {
      field: 'installation',
      name: i18n.translate('xpack.streams.entityCentricLab.integrations.ml.installation', {
        defaultMessage: 'What it does',
      }),
    },
  ];
  return (
    <SectionPanel
      title={i18n.translate('xpack.streams.entityCentricLab.integrations.ml.title', {
        defaultMessage: 'Machine learning jobs and AI skills',
      })}
      count={integration.mlAssets.length}
      dataTestSubj="entityCentricLabIntegrationMl"
    >
      <EuiInMemoryTable
        items={[...integration.mlAssets]}
        columns={columns}
        pagination={DEFAULT_PAGINATION}
      />
    </SectionPanel>
  );
};

const ResourcesSection = ({ integration }: { integration: FakeIntegration }) => (
  <SectionPanel
    title={i18n.translate('xpack.streams.entityCentricLab.integrations.resources.title', {
      defaultMessage: 'Recommended resources',
    })}
    dataTestSubj="entityCentricLabIntegrationResources"
  >
    <EuiFlexGrid columns={3}>
      {integration.resources.map((resource) => (
        <EuiFlexItem key={resource.id}>
          <EuiCard
            layout="vertical"
            titleSize="xs"
            icon={<EuiIcon type={RESOURCE_TYPE_ICON[resource.type]} size="l" />}
            title={resource.title}
            description={resource.description}
            betaBadgeProps={{ label: RESOURCE_TYPE_LABEL[resource.type] }}
            footer={
              <EuiButtonEmpty size="s" iconType="popout" iconSide="right">
                {resource.ctaLabel}
              </EuiButtonEmpty>
            }
            data-test-subj={`entityCentricLabIntegrationResource-${resource.id}`}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  </SectionPanel>
);

/**
 * Super-short-term lab: a single integration's detail page. Surfaces
 * everything the integration ships (dashboards, data streams, alert rules,
 * SLO templates, ML jobs / AI skills, curated resources) with the "what's
 * there vs what still needs enabling" split.
 */
export const IntegrationDetailView = () => {
  const {
    path: { integrationId },
  } = useStreamsAppParams('/integrations/{integrationId}');
  const router = useStreamsAppRouter();
  const {
    core: {
      http: { basePath },
      application,
    },
  } = useKibana();

  const integration = getFakeIntegration(integrationId);

  const openApp = useCallback(
    (appPath: string) => application.navigateToUrl(basePath.prepend(appPath)),
    [application, basePath]
  );
  const browseIntegrations = useCallback(
    () => application.navigateToApp('integrations'),
    [application]
  );

  if (!integration) {
    return (
      <>
        <StreamsAppPageTemplate.Header
          pageTitle={i18n.translate('xpack.streams.entityCentricLab.integrations.notFoundTitle', {
            defaultMessage: 'Unknown integration',
          })}
        />
        <StreamsAppPageTemplate.Body>
          <EuiEmptyPrompt
            iconType="questionInCircle"
            title={
              <h2>
                {i18n.translate('xpack.streams.entityCentricLab.integrations.notFoundPromptTitle', {
                  defaultMessage: 'We don\u2019t know about "{id}"',
                  values: { id: integrationId },
                })}
              </h2>
            }
            actions={
              <EuiButtonEmpty
                iconType="arrowLeft"
                onClick={() => router.push('/integrations', { path: {}, query: {} })}
              >
                {i18n.translate('xpack.streams.entityCentricLab.integrations.backToOverview', {
                  defaultMessage: 'Back to Overview',
                })}
              </EuiButtonEmpty>
            }
          />
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={integration.icon} size="xl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{integration.name}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <StarToggleButton integrationId={integration.id} />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        rightSideItems={[
          <EuiText key="version" size="xs" color="subdued">
            {i18n.translate('xpack.streams.entityCentricLab.integrations.version', {
              defaultMessage: 'v{version}',
              values: { version: integration.version },
            })}
          </EuiText>,
        ]}
      />
      <StreamsAppPageTemplate.Body>
        <EuiFlexGroup direction="column" gutterSize="l">
          {integration.updateAvailable ? (
            <EuiFlexItem grow={false}>
              <EuiCallOut
                color="primary"
                iconType="download"
                title={i18n.translate('xpack.streams.entityCentricLab.integrations.updateTitle', {
                  defaultMessage: 'New update available for the {name} integration',
                  values: { name: integration.name },
                })}
              >
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      {i18n.translate('xpack.streams.entityCentricLab.integrations.updateBody', {
                        defaultMessage:
                          'Version {version} brings new dashboards and improvements. Review before you upgrade.',
                        values: { version: integration.updateVersion ?? '' },
                      })}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty size="s" onClick={browseIntegrations}>
                      {i18n.translate(
                        'xpack.streams.entityCentricLab.integrations.updateWhatsNew',
                        {
                          defaultMessage: 'See what\u2019s new',
                        }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton size="s" onClick={browseIntegrations}>
                      {i18n.translate('xpack.streams.entityCentricLab.integrations.updateCta', {
                        defaultMessage: 'Update',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiCallOut>
            </EuiFlexItem>
          ) : null}

          <EuiFlexItem grow={false}>
            <SectionPanel
              title={i18n.translate('xpack.streams.entityCentricLab.integrations.overviewSection', {
                defaultMessage: 'Overview',
              })}
              dataTestSubj="entityCentricLabIntegrationOverview"
            >
              <IntegrationStatRow integration={integration} />
            </SectionPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <DashboardsSection
              integration={integration}
              onOpenDashboards={() => openApp('/app/dashboards')}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DataStreamsSection
              integration={integration}
              onOpenDiscover={() => openApp('/app/discover')}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertRulesSection
              integration={integration}
              onOpenAlerts={() => openApp('/app/observability/alerts')}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SloTemplatesSection
              integration={integration}
              onOpenSlos={() => openApp('/app/slos')}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <MlAssetsSection integration={integration} onOpenMl={() => openApp('/app/ml')} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ResourcesSection integration={integration} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <BrowseMoreIntegrationsBanner />
          </EuiFlexItem>
        </EuiFlexGroup>
      </StreamsAppPageTemplate.Body>
    </>
  );
};
