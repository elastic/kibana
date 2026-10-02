/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Full-page entity detail view — the `v_detail=fullPage` alternative to the
 * flyout. Renders the same tab content (Overview, Metrics, Logs, …) in a
 * full-width page layout with a header, health badge, and back navigation.
 *
 * Child entity clicks (from the Relationships tab) open a flyout on top of
 * this page, mirroring the APM service detail pattern.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutResizable,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EntityFlyout,
  EntityFlyoutServicesProvider,
  useEntityFlyoutServices,
  buildFakeEntityOverview,
  buildFakeEntityTabsData,
  isEntityTypeEnabled,
  resolveEntityTypeIdForName,
  useFlyoutTemplateOverride,
  useEntityDisplayName,
  OverviewTab,
  MetricsTab,
  LogsTab,
  AlertsTab,
  RelationshipsTab,
  TracesTab,
  ProfilingTab,
  DashboardsTab,
  DashboardsListTab,
  SlosTab,
  ServicesTab,
  ProcessesTab,
  labThing,
  alertRowToStableRuleUuid,
  entityTypeToKind,
  inferEntityKind,
  type EntitySelectionContext,
  type OnSelectEntity,
  type DashboardPreviewRequest,
  type FlyoutCustomLink,
  type LinkedDashboardOverride,
} from '@kbn/entity-centric-lab-flyout';

import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useKibana } from '../../../hooks/use_kibana';
import {
  EntityLabAlertDetailFlyoutHost,
  type EntityLabAlertDetailFlyoutRequest,
} from './entity_lab_alert_detail_flyout_host';
import { EntityLabAlertDetailMockFlyout } from './entity_lab_alert_detail_mock_flyout';
import {
  EntityLabRuleSummaryFlyout,
  type EntityLabRuleDetailFlyoutRequest,
} from './entity_lab_rule_summary_flyout';
import { StreamsElasticOnAlertsTab } from './streams_elastic_on_alerts_tab';
import { useTimeRange } from '../../../hooks/use_time_range';
import { FAKE_ENTITY_TYPES } from '../fake_entity_types';
import { K8sDetailDashboard } from './k8s_detail_dashboard';
import { podPhaseBadgeForEntity } from './bucket_metrics';
import { buildFakeEntities, getCategoryDescriptor } from './fake_entities';
import { VariationProvider, useVariation } from './variation_context';
import { VariationSwitcher } from './variation_switcher';
import type { DataVariation } from './variation_registry';

// ---------------------------------------------------------------------------
// Health badge colours (mirrors flyout)
// ---------------------------------------------------------------------------

const HEALTH_BADGE_COLOR: Record<string, string> = {
  Healthy: 'success',
  'At risk': 'warning',
  Unhealthy: 'danger',
  Degraded: 'danger',
};

const HEALTH_TAG_LABELS: ReadonlySet<string> = new Set([
  'Healthy',
  'At risk',
  'Degraded',
  'Unhealthy',
]);

// ---------------------------------------------------------------------------
// Tab definitions (same set as the flyout)
// ---------------------------------------------------------------------------

type BuiltInTabId =
  | 'overview'
  | 'metrics'
  | 'logs'
  | 'traces'
  | 'alerts'
  | 'slos'
  | 'services'
  | 'processes'
  | 'relationships'
  | 'dashboards'
  | 'custom'
  | 'profiling';

type TabId = BuiltInTabId | string;

const BUILT_IN_TAB_IDS: readonly BuiltInTabId[] = [
  'overview',
  'metrics',
  'logs',
  'traces',
  'alerts',
  'slos',
  'services',
  'processes',
  'relationships',
  'dashboards',
  'custom',
  'profiling',
];

const isBuiltInTabId = (id: string): id is BuiltInTabId =>
  (BUILT_IN_TAB_IDS as readonly string[]).includes(id);

const FULL_TAB_IDS: readonly string[] = [...BUILT_IN_TAB_IDS];

// ---------------------------------------------------------------------------
// Tab content (reuses flyout tab components)
// ---------------------------------------------------------------------------

const PageTabContent = ({
  activeTab,
  activeTabLabel,
  entityName,
  entityType,
  overview,
  tabsData,
  customLinks,
  linkedDashboards,
  onSelectEntity,
  hideAiSummary = false,
  hideOwnership = false,
  hideEvents = false,
  dashboardStyle = 'embedded',
  showDashboardThumbnails = false,
  onPreviewDashboard,
}: {
  readonly activeTab: TabId;
  readonly activeTabLabel: string;
  readonly entityName: string;
  readonly entityType?: string;
  readonly overview: ReturnType<typeof buildFakeEntityOverview>;
  readonly tabsData: ReturnType<typeof buildFakeEntityTabsData>;
  readonly customLinks?: readonly FlyoutCustomLink[];
  readonly linkedDashboards?: readonly LinkedDashboardOverride[];
  readonly onSelectEntity?: OnSelectEntity;
  readonly hideAiSummary?: boolean;
  readonly hideOwnership?: boolean;
  readonly hideEvents?: boolean;
  readonly dashboardStyle?: 'embedded' | 'list' | 'listWithPreview';
  readonly showDashboardThumbnails?: boolean;
  readonly onPreviewDashboard?: (request: DashboardPreviewRequest) => void;
}) => {
  const { resourceCopy = false, renderTabDashboard: renderDash, renderAlertsTab } =
    useEntityFlyoutServices();

  const placeholder = (
    <EuiEmptyPrompt
      iconType="documentEdit"
      title={<h2>{activeTabLabel}</h2>}
      body={
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate(
              'xpack.streams.entityCentricLab.detailPage.customTabPlaceholder',
              {
                defaultMessage:
                  'This tab was added from "Manage {thing} types". Configure its content for {entityName} to surface domain-specific data here.',
                values: { entityName, thing: labThing(resourceCopy) },
              }
            )}
          </p>
        </EuiText>
      }
    />
  );

  switch (activeTab) {
    case 'overview':
      return <OverviewTab overview={overview} metrics={tabsData.metrics} hideAiSummary={hideAiSummary} hideOwnership={hideOwnership} hideEvents={hideEvents} />;
    case 'metrics':
      return <MetricsTab metrics={tabsData.metrics} hideEvents={hideEvents} />;
    case 'logs':
      return <LogsTab entityName={entityName} logs={tabsData.logs} />;
    case 'traces':
      return tabsData.traces ? <TracesTab traces={tabsData.traces} /> : placeholder;
    case 'alerts':
      return renderAlertsTab ? (
        renderAlertsTab({ alerts: tabsData.alerts, entityName })
      ) : (
        <AlertsTab alerts={tabsData.alerts} entityName={entityName} />
      );
    case 'slos':
      return <SlosTab slos={tabsData.slos} />;
    case 'services':
      return <ServicesTab entityName={entityName} />;
    case 'processes':
      return <ProcessesTab entityName={entityName} />;
    case 'relationships':
      return (
        <RelationshipsTab
          relationships={tabsData.relationships}
          onSelectEntity={onSelectEntity}
        />
      );
    case 'dashboards':
      return dashboardStyle === 'list' || dashboardStyle === 'listWithPreview' ? (
        <DashboardsListTab
          entityName={entityName}
          entityType={entityType}
          onPreviewDashboard={onPreviewDashboard}
          showThumbnails={showDashboardThumbnails}
        />
      ) : (
        <DashboardsTab
          entityName={entityName}
          entityType={entityType}
          renderDashboard={renderDash}
          linkedDashboards={linkedDashboards}
        />
      );
    case 'profiling':
      return <ProfilingTab />;
    default:
      return placeholder;
  }
};

/**
 * Compute the Phase 1 alerts badge from an entity's `alerts` field.
 */
const computeChildAlertsBadge = (
  entity: { alerts?: { total: number; active: number } } | undefined
): { label: string; color: string } | undefined => {
  if (!entity) return undefined;
  if (!entity.alerts) return { label: 'N/A', color: 'hollow' };
  const { total, active } = entity.alerts;
  if (active > 0) return { label: `${active} active alert${active > 1 ? 's' : ''}`, color: 'danger' };
  return { label: '0 active alerts', color: 'success' };
};

const inventoryAlertsActiveOverride = (
  entity: { alerts?: { active: number } } | undefined
): number | null | undefined => {
  if (!entity) {
    return undefined;
  }
  if (entity.alerts === undefined) {
    return null;
  }
  return entity.alerts.active;
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

const EntityDetailPageInner = () => {
  const {
    path: { entityName: rawEntityName },
  } = useStreamsAppParams('/entities/detail/{entityName}');
  const entityName = decodeURIComponent(rawEntityName);
  const router = useStreamsAppRouter();
  const {
    core: { notifications },
    dependencies: {
      start: { agentBuilder, charts, observability },
    },
  } = useKibana();

  const history = useHistory();
  const detailVariation = useVariation('detail');
  const dataVariation = useVariation('data') as DataVariation;
  const phaseVariation = useVariation('phase');
  const dashboardStyleVariation = useVariation('dashboardStyle') as 'embedded' | 'list' | 'listWithPreview';
  const showDashboardThumbnails = useVariation('dashboardThumbnails') === 'show';
  const isPhase1 = phaseVariation === 'phase1';
  const [dashboardPreview, setDashboardPreview] = useState<DashboardPreviewRequest | null>(null);
  const [alertDetailRequest, setAlertDetailRequest] =
    useState<EntityLabAlertDetailFlyoutRequest | null>(null);
  const [ruleDetailRequest, setRuleDetailRequest] =
    useState<EntityLabRuleDetailFlyoutRequest | null>(null);
  // Track whether we arrived via in-app navigation (expandable flyout) so
  // we can use history.goBack() to restore the flyout on "Back".
  // history.action === 'PUSH' means the user navigated here from another
  // in-app page; 'POP' means a direct URL load, refresh, or browser
  // back/forward — in those cases goBack() is unreliable.
  const cameFromApp = useRef(history.action === 'PUSH');
  const dataset = useMemo(() => buildFakeEntities(dataVariation), [dataVariation]);

  const entityByName = useMemo(() => {
    const map = new Map<string, (typeof dataset.entities)[number]>();
    for (const entity of dataset.entities) {
      map.set(entity.name, entity);
    }
    return map;
  }, [dataset]);

  const entity = entityByName.get(entityName);
  const entityType = entity?.type;
  const entityHealth = entity?.health;
  const entityRegion = entity?.tags.region;

  const kind = useMemo(
    () => entityTypeToKind(entityType) ?? inferEntityKind(entityName),
    [entityType, entityName]
  );

  // Fake data builders
  const overview = useMemo(
    () => buildFakeEntityOverview(entityName, entityType, entityHealth, entityRegion),
    [entityName, entityType, entityHealth, entityRegion]
  );
  const alertsActiveOverride = inventoryAlertsActiveOverride(entity);
  const tabsData = useMemo(
    () => buildFakeEntityTabsData(entityName, entityType, entityHealth, alertsActiveOverride),
    [entityName, entityType, entityHealth, alertsActiveOverride]
  );

  const displayName = useEntityDisplayName(entityName, entityType);

  // Badge order — Phase 1: category → type → alerts → rest (matches flyout).
  // Non-Phase-1: lead with the health indicator badge.
  const orderedTags = useMemo(() => {
    if (isPhase1) {
      const withoutHealth = overview.tags.filter((tag) => !HEALTH_TAG_LABELS.has(tag.label));
      const primary = withoutHealth.slice(0, 2);
      const rest = withoutHealth.slice(2);
      if (entity?.alerts) {
        const { active } = entity.alerts;
        const alertTag = active > 0
          ? { label: `${active} active alert${active > 1 ? 's' : ''}`, color: 'danger' }
          : { label: '0 active alerts', color: 'success' };
        return [...primary, alertTag, ...rest];
      }
      return [...primary, { label: 'N/A', color: 'hollow' }, ...rest];
    }
    const healthIndex = overview.tags.findIndex((tag) => HEALTH_TAG_LABELS.has(tag.label));
    if (healthIndex <= 0) return overview.tags;
    const rest = overview.tags.filter((_, index) => index !== healthIndex);
    return [overview.tags[healthIndex], ...rest];
  }, [overview.tags, isPhase1, entity]);

  const podPhaseBadge = useMemo(() => podPhaseBadgeForEntity(entity), [entity]);

  // Tab template override (wizard customisations)
  const entityTypeId = useMemo(
    () => resolveEntityTypeIdForName(entityName, entityType),
    [entityName, entityType]
  );
  const templateOverride = useFlyoutTemplateOverride(entityTypeId);

  // Tab list
  const tabs = useMemo<Array<{ id: TabId; label: string; appendBadge?: number }>>(() => {
    const isAllowedTabId = (id: string): boolean => FULL_TAB_IDS.includes(id);
    // Default tab order must match the flyout (entity_flyout.tsx) so that
    // expanding / collapsing never shuffles the tab bar.
    const defaultTabs: Array<{ id: TabId; label: string; appendBadge?: number }> = [
      {
        id: 'overview',
        label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.overview', {
          defaultMessage: 'Overview',
        }),
      },
      {
        id: 'dashboards',
        label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.dashboards', {
          defaultMessage: 'Dashboards',
        }),
      },
      {
        id: 'logs',
        label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.logs', {
          defaultMessage: 'Logs',
        }),
      },
      ...(tabsData.traces
        ? [
            {
              id: 'traces' as TabId,
              label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.traces', {
                defaultMessage: 'Traces',
              }),
            },
          ]
        : []),
      {
        id: 'alerts',
        label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.alerts', {
          defaultMessage: 'Alerts',
        }),
        appendBadge: (() => {
          const count = entity?.alerts?.active;
          return count && count > 0 ? count : undefined;
        })(),
      },
      {
        id: 'slos',
        label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.slos', {
          defaultMessage: 'SLOs',
        }),
        appendBadge: (() => {
          const breaching = tabsData.slos.slos.filter((s) => s.status === 'Breaching').length;
          return breaching > 0 ? breaching : undefined;
        })(),
      },
      ...(kind === 'host'
        ? [
            {
              id: 'services' as TabId,
              label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.services', {
                defaultMessage: 'Services',
              }),
            },
            {
              id: 'processes' as TabId,
              label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.processes', {
                defaultMessage: 'Processes',
              }),
            },
          ]
        : []),
      {
        id: 'relationships',
        label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.relationships', {
          defaultMessage: 'Relationships',
        }),
      },
      {
        id: 'custom',
        label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.custom', {
          defaultMessage: 'Custom',
        }),
      },
      {
        id: 'profiling',
        label: i18n.translate('xpack.streams.entityCentricLab.detailPage.tabs.profiling', {
          defaultMessage: 'Profiling',
        }),
      },
    ].filter((tab) => isAllowedTabId(tab.id));

    if (!templateOverride) return defaultTabs;

    const overrideTabs = templateOverride.flyoutTabs
      .filter((tab) => tab.enabled && isAllowedTabId(tab.id))
      .map((tab) => {
        const builtIn = isBuiltInTabId(tab.id)
          ? defaultTabs.find((candidate) => candidate.id === tab.id)
          : undefined;
        return {
          id: tab.id,
          label: tab.label,
          appendBadge: builtIn?.appendBadge,
        };
      });

    if (!overrideTabs.some((tab) => tab.id === 'relationships')) {
      const relationshipsTab = defaultTabs.find((tab) => tab.id === 'relationships');
      if (relationshipsTab) return [...overrideTabs, relationshipsTab];
    }

    return overrideTabs;
  }, [templateOverride, tabsData.traces, tabsData.slos, entity?.alerts?.active, kind]);

  // Phase-1 exclusion: drop Custom and Relationships tabs.
  const visibleTabs = useMemo(
    () =>
      isPhase1
        ? tabs.filter(
            (tab) => tab.id !== 'custom' && tab.id !== 'relationships' && tab.id !== 'profiling'
          )
        : tabs,
    [tabs, isPhase1]
  );

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const STORED_TAB_KEY = 'entityCentricLab_activeTab';
    try {
      const stored = sessionStorage.getItem(STORED_TAB_KEY);
      sessionStorage.removeItem(STORED_TAB_KEY);
      if (stored) return stored as TabId;
    } catch {
      // sessionStorage unavailable
    }
    return 'overview';
  });

  // Fall back when active tab disappears
  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  // Child entity flyout (opened from Relationships tab)
  const [childEntityName, setChildEntityName] = useState<string | null>(null);
  const [childEntityContext, setChildEntityContext] = useState<EntitySelectionContext | null>(null);

  const openChildEntity = useCallback(
    (name: string, context?: EntitySelectionContext) => {
      const matched = entityByName.get(name);
      const resolvedTypeId = resolveEntityTypeIdForName(name, matched?.type);
      if (!isEntityTypeEnabled(resolvedTypeId)) return;
      setChildEntityName(name);
      setChildEntityContext(context ?? null);
    },
    [entityByName]
  );

  const closeChildEntity = useCallback(() => {
    setChildEntityName(null);
    setChildEntityContext(null);
  }, []);

  const childEntity = childEntityName ? entityByName.get(childEntityName) : undefined;
  const childEntityType = childEntityContext?.entityType ?? childEntity?.type;
  const childEntityHealth = childEntityContext?.health ?? childEntity?.health;
  const childEntityRegion = childEntityContext?.region ?? childEntity?.tags.region;

  const { rangeFrom, rangeTo } = useTimeRange();

  // Dashboards tab: embed a specific dashboard by its saved-object title.
  // User-linked dashboards carry a `savedObjectId` directly so the renderer
  // skips the title-based lookup.
  const renderTabDashboard = useCallback(
    (
      dashboard: {
        savedObjectTitle: string;
        scopeField: string;
        hiddenPanelIds?: ReadonlySet<string>;
        savedObjectId?: string;
      },
      name: string
    ) => (
      <K8sDetailDashboard
        config={{
          dashboardTitle: dashboard.savedObjectTitle,
          scopeField: dashboard.scopeField,
          hiddenPanelIds: dashboard.hiddenPanelIds ?? new Set(),
        }}
        resourceName={name}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        directSavedObjectId={dashboard.savedObjectId}
      />
    ),
    [rangeFrom, rangeTo]
  );

  // Flyout services for child flyout + tab components
  const renderAlertDetailFlyout = useMemo(
    () => observability?.renderEntityCentricLabAlertDetailFlyout,
    [observability]
  );

  const onOpenAlertDetail = useCallback((request: EntityLabAlertDetailFlyoutRequest) => {
    setRuleDetailRequest(null);
    setAlertDetailRequest(request);
  }, []);

  const closeAlertDetail = useCallback(() => {
    setAlertDetailRequest(null);
  }, []);

  const onOpenRuleDetail = useCallback((request: EntityLabRuleDetailFlyoutRequest) => {
    setAlertDetailRequest(null);
    setRuleDetailRequest(request);
  }, []);

  const closeRuleDetail = useCallback(() => {
    setRuleDetailRequest(null);
  }, []);

  const flyoutServices = useMemo(
    () => ({
      agentBuilder,
      notifications,
      charts,
      renderTabDashboard,
      resourceCopy: true,
      renderAlertDetailFlyout,
      onOpenAlertDetail,
      onOpenRuleDetail,
      renderAlertsTab: ({
        alerts,
        entityName: alertEntityName,
      }: {
        alerts: import('@kbn/entity-centric-lab-flyout').AlertsTabData;
        entityName: string;
      }) => (
        <StreamsElasticOnAlertsTab
          alerts={alerts}
          entityName={alertEntityName}
          onOpenAlertRow={(row) =>
            onOpenAlertDetail({ alertRow: row, entityName: alertEntityName })
          }
          onOpenRuleRow={(row) =>
            onOpenRuleDetail({
              ruleId: alertRowToStableRuleUuid(row),
              ruleName: row.ruleName,
              entityName: alertEntityName,
              alertRow: row,
            })
          }
        />
      ),
    }),
    [
      agentBuilder,
      notifications,
      charts,
      renderTabDashboard,
      renderAlertDetailFlyout,
      onOpenAlertDetail,
      onOpenRuleDetail,
    ]
  );

  // Navigate back to inventory, restoring the flyout for the current entity.
  // When we arrived from an expandable flyout (in-app navigation), use
  // history.goBack() so the list view URL — including the `flyoutEntity`
  // query param — is restored and the flyout re-opens automatically.
  // Otherwise navigate to the category page with `?entity=` so the flyout
  // opens on arrival rather than just closing.
  const handleBack = useCallback(() => {
    try {
      sessionStorage.setItem('entityCentricLab_activeTab', activeTab);
    } catch {
      // ignore
    }
    if (detailVariation === 'flyoutExpandable' && cameFromApp.current) {
      history.goBack();
      return;
    }
    const basePath = entity?.category ? `/entities/${entity.category}` : '/entities';
    history.push(`${basePath}?entity=${encodeURIComponent(entityName)}`);
  }, [entity, entityName, detailVariation, history, activeTab]);

  // "Add to filter" — stashes the entity's K8s context in sessionStorage
  // and navigates back to the inventory so the main page can apply filters.
  const isK8sEntity = entity?.category === 'kubernetes';
  const handleAddToFilter = useCallback(() => {
    if (!entity || entity.category !== 'kubernetes') return;
    try {
      sessionStorage.setItem(
        'entityCentricLab_addToFilter',
        JSON.stringify({
          cluster:
            entity.subType === 'Clusters'
              ? entity.name
              : entity.attributes?.cluster ?? '',
          namespace:
            entity.subType === 'Namespaces'
              ? entity.name
              : entity.attributes?.namespace ?? '',
          deployment:
            entity.subType === 'Deployments'
              ? entity.name
              : entity.attributes?.deployment ?? '',
          node:
            entity.subType === 'Nodes'
              ? entity.name
              : entity.attributes?.node ?? '',
        })
      );
    } catch {
      // ignore
    }
    router.push('/entities/{category}', {
      path: { category: 'kubernetes' },
      query: {},
    });
  }, [entity, router]);

  // "Take action" popover (mirrors flyout footer)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const closeActionMenu = useCallback(() => setIsActionMenuOpen(false), []);

  const handleActionClick = useCallback(
    (actionLabel: string) => {
      closeActionMenu();
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.entityCentricLab.detailPage.actionToast', {
          defaultMessage: '{actionLabel} — coming soon',
          values: { actionLabel },
        }),
      });
    },
    [closeActionMenu, notifications]
  );

  // Manage entity type — moved before actionPanels to avoid TDZ.
  const handleManageEntityType = useCallback(() => {
    const managedType = FAKE_ENTITY_TYPES.find(
      (ft) => ft.name.toLowerCase() === entityType?.toLowerCase()
    );
    if (managedType) {
      router.push('/manage-entity-types', {
        path: {},
        query: { edit: managedType.id },
      });
    } else {
      router.push('/manage-entity-types', { path: {}, query: {} });
    }
  }, [entityType, router]);

  const actionPanels = useMemo(() => {
    const items: Array<{ name?: string; icon?: string; onClick?: () => void; isSeparator?: boolean; key?: string }> = [
      {
        name: i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewInApm', {
          defaultMessage: 'View in APM',
        }),
        icon: 'apmApp',
        onClick: () =>
          handleActionClick(
            i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewInApm', {
              defaultMessage: 'View in APM',
            })
          ),
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewMetrics', {
          defaultMessage: 'View metrics in Discover',
        }),
        icon: 'discoverApp',
        onClick: () =>
          handleActionClick(
            i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewMetrics', {
              defaultMessage: 'View metrics in Discover',
            })
          ),
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewLogs', {
          defaultMessage: 'View logs in Discover',
        }),
        icon: 'discoverApp',
        onClick: () =>
          handleActionClick(
            i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewLogs', {
              defaultMessage: 'View logs in Discover',
            })
          ),
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewTraces', {
          defaultMessage: 'View traces in Discover',
        }),
        icon: 'discoverApp',
        onClick: () =>
          handleActionClick(
            i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewTraces', {
              defaultMessage: 'View traces in Discover',
            })
          ),
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewInIntegrations', {
          defaultMessage: 'View in Integrations',
        }),
        icon: 'package',
        onClick: () =>
          handleActionClick(
            i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.viewInIntegrations', {
              defaultMessage: 'View in Integrations',
            })
          ),
      },
      { isSeparator: true, key: 'sep-manage' },
    ];

    if (isK8sEntity) {
      items.push({
        name: i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.addToFilter', {
          defaultMessage: 'Add to filter',
        }),
        icon: 'filter',
        onClick: () => {
          closeActionMenu();
          handleAddToFilter();
        },
      });
    }

    items.push(
      {
        name: i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.addToCase', {
          defaultMessage: 'Add to case',
        }),
        icon: 'casesApp',
        onClick: () =>
          handleActionClick(
            i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.addToCase', {
              defaultMessage: 'Add to case',
            })
          ),
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.createAlertRule', {
          defaultMessage: 'Create alert rule',
        }),
        icon: 'bell',
        onClick: () =>
          handleActionClick(
            i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.createAlertRule', {
              defaultMessage: 'Create alert rule',
            })
          ),
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.createSlo', {
          defaultMessage: 'Create SLO',
        }),
        icon: 'visGauge',
        onClick: () =>
          handleActionClick(
            i18n.translate('xpack.streams.entityCentricLab.detailPage.actions.createSlo', {
              defaultMessage: 'Create SLO',
            })
          ),
      },
    );

    return [{ id: 0, items }];
  }, [handleActionClick, isK8sEntity, handleAddToFilter, closeActionMenu]);

  const handleAddToChat = useCallback(() => {
    if (!agentBuilder?.openChat) return;
    agentBuilder.openChat({
      attachments: [
        {
          type: 'observability-service',
          data: { serviceName: entityName },
        },
      ],
    });
  }, [agentBuilder, entityName]);

  // Manage entity type
  // Unknown entity
  if (!entity) {
    return (
      <StreamsAppPageTemplate>
        <StreamsAppPageTemplate.Header
          pageTitle={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowLeft"
                  aria-label="Back to inventory"
                  color="text"
                  display="empty"
                  size="s"
                  onClick={handleBack}
                  data-test-subj="entityDetailBackButton"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{entityName}</EuiFlexItem>
            </EuiFlexGroup>
          }
        />
        <StreamsAppPageTemplate.Body>
          <EuiEmptyPrompt
            iconType="alert"
            title={
              <h2>
                {i18n.translate(
                  'xpack.streams.entityCentricLab.detailPage.unknownEntity.title',
                  { defaultMessage: 'Resource not found' }
                )}
              </h2>
            }
            body={
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.streams.entityCentricLab.detailPage.unknownEntity.body',
                    {
                      defaultMessage:
                        '"{entityName}" could not be found in the current dataset.',
                      values: { entityName },
                    }
                  )}
                </p>
              </EuiText>
            }
            actions={
              <EuiButtonEmpty iconType="arrowLeft" onClick={handleBack}>
                {i18n.translate(
                  'xpack.streams.entityCentricLab.detailPage.unknownEntity.backButton',
                  { defaultMessage: 'Back to inventory' }
                )}
              </EuiButtonEmpty>
            }
          />
        </StreamsAppPageTemplate.Body>
      </StreamsAppPageTemplate>
    );
  }

  return (
    <EntityFlyoutServicesProvider services={flyoutServices}>
      <StreamsAppPageTemplate>
        <StreamsAppPageTemplate.Header
          pageTitle={
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowLeft"
                  aria-label="Back to inventory"
                  color="text"
                  display="empty"
                  size="xs"
                  onClick={handleBack}
                  data-test-subj="entityDetailBackButton"
                />
              </EuiFlexItem>
              {entity?.category ? (
                <EuiFlexItem grow={false}>
                  <EuiIcon type={getCategoryDescriptor(entity.category)?.icon ?? 'package'} size="l" />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>{displayName}</EuiFlexItem>
            </EuiFlexGroup>
          }
          rightSideItems={[
            <EuiPopover
              key="actions"
              button={
                <EuiButton
                  fill
                  iconType="arrowDown"
                  iconSide="right"
                  data-test-subj="entityDetailPageTakeAction"
                  onClick={() => setIsActionMenuOpen((open) => !open)}
                >
                  {i18n.translate('xpack.streams.entityCentricLab.detailPage.takeAction', {
                    defaultMessage: 'Take action',
                  })}
                </EuiButton>
              }
              isOpen={isActionMenuOpen}
              closePopover={closeActionMenu}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenu initialPanelId={0} panels={actionPanels} size="s" />
            </EuiPopover>,
            ...(agentBuilder?.openChat
              ? [
                  <EuiButtonEmpty
                    key="add-to-chat"
                    iconType="productRobot"
                    data-test-subj="entityDetailPageAddToChat"
                    onClick={handleAddToChat}
                  >
                    {i18n.translate('xpack.streams.entityCentricLab.detailPage.addToChat', {
                      defaultMessage: 'Add to chat',
                    })}
                  </EuiButtonEmpty>,
                ]
              : []),
          ]}
          tabs={visibleTabs.map((tab) => ({
            label: tab.label,
            isSelected: tab.id === activeTab,
            onClick: () => { setActiveTab(tab.id); setDashboardPreview(null); },
            'data-test-subj': `entityDetailPageTab-${tab.id}`,
            append:
              tab.appendBadge !== undefined ? (
                <EuiNotificationBadge color="accent" size="s">
                  {tab.appendBadge}
                </EuiNotificationBadge>
              ) : undefined,
          }))}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
            {orderedTags.map((tag) => (
              <EuiFlexItem grow={false} key={tag.label}>
                <EuiBadge color={tag.color}>{tag.label}</EuiBadge>
              </EuiFlexItem>
            ))}
            {podPhaseBadge ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color={podPhaseBadge.color} data-test-subj="entityDetailPagePodPhaseBadge">
                  {podPhaseBadge.label}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </StreamsAppPageTemplate.Header>
        <StreamsAppPageTemplate.Body>
          <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
            <PageTabContent
              activeTab={activeTab}
              activeTabLabel={visibleTabs.find((tab) => tab.id === activeTab)?.label ?? activeTab}
              entityName={entityName}
              entityType={entityType}
              overview={overview}
              tabsData={tabsData}
              customLinks={templateOverride?.customLinks}
              linkedDashboards={templateOverride?.linkedDashboards}
              onSelectEntity={openChildEntity}
              hideAiSummary={isPhase1}
              hideOwnership={isPhase1}
              hideEvents={isPhase1}
              dashboardStyle={dashboardStyleVariation}
              showDashboardThumbnails={showDashboardThumbnails}
              onPreviewDashboard={dashboardStyleVariation === 'listWithPreview' ? setDashboardPreview : undefined}
            />
          </EuiPanel>
        </StreamsAppPageTemplate.Body>
        <VariationSwitcher />
      </StreamsAppPageTemplate>

      {childEntityName ? (
        <EntityFlyout
          session="never"
          size="m"
          entityName={childEntityName}
          entityType={childEntityType}
          entityHealth={childEntityHealth}
          region={childEntityRegion}
          onClose={closeChildEntity}
          onSelectEntity={openChildEntity}
          onNavigateEntity={openChildEntity}
          hideHealthBadge={isPhase1}
          alertsBadge={isPhase1 ? computeChildAlertsBadge(childEntity) : undefined}
          alertsActiveCount={inventoryAlertsActiveOverride(childEntity)}
          podPhaseBadge={podPhaseBadgeForEntity(childEntity)}
          timeRange={{ from: rangeFrom, to: rangeTo }}
          hideAiSummary={isPhase1}
          hideOwnership={isPhase1}
          hideEvents={isPhase1}
          hiddenTabIds={isPhase1 ? ['custom', 'relationships', 'profiling'] : undefined}
          dashboardStyle={dashboardStyleVariation}
          showDashboardThumbnails={showDashboardThumbnails}
        />
      ) : null}

      {dashboardPreview ? (
        <EuiFlyoutResizable
          ownFocus={false}
          onClose={() => setDashboardPreview(null)}
          hideCloseButton
          size="l"
          data-test-subj="entityDetailPageDashboardPreview"
        >
          <EuiFlyoutHeader hasBorder css={css`padding-bottom: 0;`}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false} css={css`margin-bottom: -4px;`}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="editorUndo"
                  size="xs"
                  flush="left"
                  color="text"
                  onClick={() => setDashboardPreview(null)}
                  data-test-subj="entityDetailPageDashboardPreviewBack"
                >
                  {i18n.translate('xpack.streams.entityCentricLab.detailPage.dashboardPreview.back', {
                    defaultMessage: 'Back',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="cross"
                  size="xs"
                  aria-label={i18n.translate(
                    'xpack.streams.entityCentricLab.detailPage.dashboardPreview.closeAriaLabel',
                    { defaultMessage: 'Close' }
                  )}
                  color="text"
                  display="empty"
                  onClick={() => setDashboardPreview(null)}
                  data-test-subj="entityDetailPageDashboardPreviewClose"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="xs" css={css`margin-left: -24px; margin-right: -24px; width: auto;`} />
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{dashboardPreview.title}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="popout"
                  size="xs"
                  href={dashboardPreview.href}
                  target="_blank"
                  data-test-subj="entityDetailPageDashboardPreviewOpenNewTab"
                >
                  {i18n.translate(
                    'xpack.streams.entityCentricLab.detailPage.dashboardPreview.viewInNewTab',
                    { defaultMessage: 'View in new tab' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {renderTabDashboard(
              {
                savedObjectTitle: dashboardPreview.dashboard.savedObjectTitle,
                scopeField: dashboardPreview.dashboard.scopeField,
                savedObjectId: dashboardPreview.dashboard.savedObjectId,
              },
              entityName
            )}
          </EuiFlyoutBody>
        </EuiFlyoutResizable>
      ) : null}
      {alertDetailRequest && renderAlertDetailFlyout ? (
        <EntityLabAlertDetailFlyoutHost
          request={alertDetailRequest}
          onClose={closeAlertDetail}
          renderAlertDetailFlyout={renderAlertDetailFlyout}
        />
      ) : null}
      {alertDetailRequest && !renderAlertDetailFlyout ? (
        <EntityLabAlertDetailMockFlyout
          alertRow={alertDetailRequest.alertRow}
          entityName={alertDetailRequest.entityName}
          onClose={closeAlertDetail}
        />
      ) : null}
      {ruleDetailRequest ? (
        <EntityLabRuleSummaryFlyout
          key={ruleDetailRequest.ruleId}
          request={ruleDetailRequest}
          onClose={closeRuleDetail}
        />
      ) : null}
    </EntityFlyoutServicesProvider>
  );
};

/**
 * Public wrapper that places the {@link VariationProvider} above the
 * page so `useVariation` hooks inside can read URL-backed variation
 * state.
 */
export const EntityDetailPage = () => (
  <VariationProvider>
    <EntityDetailPageInner />
  </VariationProvider>
);
