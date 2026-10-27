/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Floating bottom-right popover that lets you switch between prototype
 * variations (data profiles, UI alternatives, …). ElasticOn-only.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPopover,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useKibana } from '../../../hooks/use_kibana';
import { useVariationContext } from './variation_context';
import type { VariationDimension } from './variation_registry';

/**
 * Lab prototype build number shown in the variation selector.
 * Bump by 0.01 on each prototype push (e.g. 1.00 → 1.01 → 1.02).
 */
export const PROTOTYPE_VERSION = '1.16';

/**
 * Newest-first change log for the About tab. Update on each prototype push
 * alongside {@link PROTOTYPE_VERSION}. `details` is the commit body when one
 * exists (plain prose or short bullets).
 */
const PROTOTYPE_CHANGELOG: readonly {
  readonly date: string;
  readonly summary: string;
  readonly details?: string;
}[] = [
  {
    date: '2026-10-27',
    summary:
      'Infrastructure nav badges, flyout polish, All resources category filters, and K8s hex stat locks.',
    details:
      'Left nav shows hollow inventory totals or danger alerting/total badges (10k cap), with click-through to active alerts. Flyout header alerts badge opens Alerts tab; Overview golden signals sit above Resource details; full-width time pickers on flyout and detail page; log document child flyout uses a link icon for copy link. All resources category filter exposes the same sub-filters as left-nav category pages (Hosts extras, K8s strip, type, Cloud provider). CronJob hex stats lock Failures to Last and Avg duration to Avg. Bump to v1.16.',
  },
  {
    date: '2026-10-27',
    summary:
      'Inventory defaults: Normal display density (not Compact) and 10 rows per table page; K8s list/hex type order and K8s Cluster-style labels aligned.',
    details:
      'Display options and page-size picker still offer Compact / Normal / Expanded and 10 / 25 / 50; choices persist in localStorage and saved views. Bump to v1.15.',
  },
  {
    date: '2026-10-22',
    summary:
      'Inventory summary KPI cards, hex display-options reset, and scoped K8s add-to-filter.',
    details:
      'List Inventory tab shows golden-signal-style summary cards (total resources, active alerts, no alert set up) with sparklines, click-to-filter via ?alertsFilter=, and neutral vs danger styling. Hex map Display options flyout is wider with Reset to defaults. Kubernetes grid Filter for and flyout Add to filter only on the K8s category page or All resources when the category filter is Kubernetes. Bump to v1.13.',
  },
  {
    date: '2026-10-22',
    summary: 'Compact golden signal tiles and K8s filter-for via facet dropdowns.',
    details:
      'Flyout and expanded Overview golden signal summary cards are shorter with balanced value/unit typography (Display options still scales density). Kubernetes grid “Filter for” sets page cluster/namespace/node/deployment dropdowns only—no search-bar pills and no “Filter out” cell action. Bump to v1.12.',
  },
  {
    date: '2026-10-22',
    summary:
      'Left-nav inventory counts, alert dots, list defaults, and group-by label polish.',
    details:
      'Infrastructure nav shows inventoried totals in category titles and a clickable red dot when a category has active alerts (deep-links to ?alertsFilter=active on Inventory). Default list table page size is 25 for new views. Demo data keeps Databases and Storage free of firing alerts. Group resources by link lists locked levels (e.g. Category, Type on scoped pages). Bump to v1.11.',
  },
  {
    date: '2026-10-22',
    summary:
      'Discover-style filter for / filter out on Kubernetes inventory list grids.',
    details:
      'ElasticOn data grids on cluster, namespace, node, and deployment columns (plus name on those resource tables): plus/minus cell actions update page K8s dropdowns or search-bar phrase chips. Wired through Security grouping (default table style) and Default list layout. Bump to v1.10.',
  },
  {
    date: '2026-10-21',
    summary:
      'Cloud account KQL/column, K8s node host runtime tabs, and APM services labeling.',
    details:
      'Filter and column for ECS cloud.account.id / cloud.account.name on cloud resources; fix Cloud inventory scoping to provider-backed entities. Kubernetes nodes get APM services and Processes tabs (kubelet/CRI demo processes) while keeping the K8s-first Overview; rename the host runtime tab to “APM services” to avoid clashing with Kubernetes Services. Bump to v1.09.',
  },
  {
    date: '2026-10-21',
    summary:
      'New/ classic UX toggle, shareable inventory URLs, and dashboard linking polish.',
    details:
      'Kebab “New experience” syncs with Advanced Settings (New infrastructure experience); classic screenshot overlay with transition modal; hi-res old Hosts asset; inventory state in ?inventory= URLs and nav saved-view links; saved-view viewMode restore; custom dashboards “Port resource name to dashboard” option and updated Create dashboard agent prompt. Bump to v1.08.',
  },
  {
    date: '2026-10-20',
    summary:
      'Lazy sparklines, VM default metrics, and flyout icon fixes.',
    details:
      'Table sparklines load asynchronously (viewport-gated with staggered fade-in). Add default CPU/Memory/Disk columns for VM hosts table. Bump to v1.07.',
  },
  {
    date: '2026-10-16',
    summary:
      'Flyout title icons match category icons for all entity types.',
    details:
      'Flyout header icon now resolves cloud sub-categories (Lambda → function, S3 → folderOpen, VPC/CDN → globe), networking types (Nginx, HAProxy, Envoy → globe), and Other (→ package). Icon always renders even when no EntityKind is resolved. Bump to v1.06.',
  },
  {
    date: '2026-10-16',
    summary:
      'Compact density font sizes, KQL alerts field, hex-map alert badges, collapsible groups, and UI polish.',
    details:
      'Flyout tables use smaller font in compact density (all tabs). Add "alerts" as a KQL search field (active / no_setup / no_active). Red alert-count badges on hex-map group headers (SubTypeRow, CategoryHeader, CloudProviderHeader, custom groups). Collapsible hex-map groups across all group types. Replace EuiLink buttons with plain anchors in flyout table cells for correct font-size inheritance. Remove left-nav notification dots (temporarily). Bump to v1.05.',
  },
  {
    date: '2026-10-15',
    summary:
      'Add alert filter, nav badge counts, and page-level display density setting.',
    details:
      'Filter entities by alert status (with active alerts / no active alerts / no alert set up). Show alert counts as badges in the left nav per category. New Display options popover (Compact / Normal / Expanded) persisted in localStorage, controlling table density, data-grid cell padding/font size, and hex-map card panel padding. Reduce margins between hex blocks and chase vertical space across list view. Bump to v1.04.',
  },
  {
    date: '2026-10-15',
    summary:
      'Add prototype About tab with change log, hex-map legend help, and inventory polish.',
    details:
      'Variation selector tabs (settings / about) with design disclaimer and scrollable change log; hex Color-by legends get info tips and metric (stat) labels; P95/P99 stats; Availability Zone group-by; column/flyout metric explanations; utilization wording; Create dashboard primary button. Group by control gets an info tip (nesting, examples, order matters). Bump to v1.03.',
  },
  {
    date: '2026-10-14',
    summary: 'Polish entity flyout dashboards, host runtime tabs, and the SLO table.',
    details:
      'Show the resource name on dashboard previews, give cloud machines Services and Processes, drop the SLO budget column, and open the agent from Create dashboard. Bump the prototype to v1.01.',
  },
  {
    date: '2026-10-12',
    summary: 'Polish ElasticOn inventory sharing, hex legend counts, and 10k+ host types.',
    details:
      'Make flyout state shareable with independent time range, show categorical hex legend counts, keep cloud host types and the truncation banner in the overflow profile, and use full entity type names in category type filters.',
  },
  {
    date: '2026-10-09',
    summary: 'Polish ElasticOn lab tour, more-actions menu, and prototype versioning.',
    details:
      'Add play-tour/revert actions, move reset into the variation selector, clarify list-first tour copy, and show prototype v1.00.',
  },
  {
    date: '2026-10-06',
    summary: 'Polish entity flyout, inventory, and K8s demo dashboards for Phase 1.',
    details:
      'Keep dashboard overlays when switching resources, remember tabs, cap date-picker shortcuts, and seed alerting K8s entities with volume metrics.',
  },
  {
    date: '2026-10-06',
    summary: 'Add Environment and Region options to the inventory Group by dropdown.',
  },
  {
    date: '2026-10-02',
    summary: 'Harden inventory filters and saved-view change detection for Phase 1.',
    details:
      'Track all filter dimensions in the unsaved badge next to Save view, scope KQL fields (drop health in Phase 1), and align the type filter with the search bar.',
  },
  {
    date: '2026-10-02',
    summary: 'Add Other nav category, dashboard thumbnail variation, and saved-views collapse/reorder.',
  },
  {
    date: '2026-10-02',
    summary: 'Polish entity-centric flyout alerts, services, and empty states.',
    details:
      'Make alert child flyouts resizable, add SLO/alert create CTAs when unset, align PayFlow inventory alert counts with curated tabs, and refresh the host services table.',
  },
  {
    date: '2026-10-01',
    summary:
      'Align entity-centric inventory with flyout alerts and pod phase, and scope search/group-by by category.',
  },
  {
    date: '2026-10-01',
    summary: 'ElasticOn Phase 1: dashboard preview defaults, Messaging empty state, and flyout polish.',
    details:
      'Default Phase 1 to list + flyout preview, seed Messaging as the demo empty category with a deploy-safe Add data link, and align log document and dashboard preview flyouts with the parent.',
  },
  {
    date: '2026-09-29',
    summary: 'Latest and greatest.',
  },
  {
    date: '2026-09-28',
    summary:
      'ElasticOn: top-level category filter, remove per-section filters, flyout badge reorder with +N more.',
    details:
      'Category filter on All resources with sub-filters; remove per-section inline filters; flyout badges reorder to category → type → alerts with +N more; dedicated close/expand row; Metrics tab moved into Overview.',
  },
  {
    date: '2026-09-28',
    summary:
      'Phase 1: remove APM Services nav, relocate metrics to overview, add resource/alerts labels to list view.',
    details:
      'Remove APM Services from ElasticOn nav; relocate charts into Overview golden signals; add Resources / Resources with alerts labels on list badges.',
  },
  {
    date: '2026-09-26',
    summary: 'Fix Dashboard crash: remove uiSettings TIMEPICKER_QUICK_RANGES override.',
    details:
      'Synchronous uiSettings.set() for quick-select presets bled into Dashboard/Discover and crashed QueryBarTopRow. Removed the override and added a one-time repair for corrupted persisted values; Max 3 days validation stays component-scoped.',
  },
  {
    date: '2026-09-25',
    summary: 'List view: sparkline variety & smoothing, K8s workload metrics, column tweaks.',
    details:
      'Richer sparkline shapes with smooth curves; ReplicaSet/StatefulSet/DaemonSet/CronJob metrics and color-by; environment/region off by default; equal-width columns.',
  },
];

type PopoverTabId = 'settings' | 'about';

// ---------------------------------------------------------------------------
// Per-dimension row
// ---------------------------------------------------------------------------

const DimensionRow = ({
  dimension,
  activeOptionId,
  onChange,
}: {
  dimension: VariationDimension;
  activeOptionId: string;
  onChange: (dimensionId: string, optionId: string) => void;
}) => {
  const buttonGroupOptions = useMemo(
    () =>
      dimension.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
      })),
    [dimension.options]
  );

  const handleChange = useCallback(
    (optionId: string) => onChange(dimension.id, optionId),
    [dimension.id, onChange]
  );

  const activeDescription = dimension.options.find(
    (opt) => opt.id === activeOptionId
  )?.description;

  return (
    <EuiFormRow label={dimension.label} fullWidth>
      <>
        <EuiButtonGroup
          legend={dimension.label}
          options={buttonGroupOptions}
          idSelected={activeOptionId}
          onChange={handleChange}
          buttonSize="compressed"
          isFullWidth
        />
        {activeDescription ? (
          <EuiText size="xs" color="subdued" css={css`margin-top: 4px;`}>
            <p>{activeDescription}</p>
          </EuiText>
        ) : null}
      </>
    </EuiFormRow>
  );
};

// ---------------------------------------------------------------------------
// Seed K8s demo data button
// ---------------------------------------------------------------------------

const SeedDemoDataButton = () => {
  const { core } = useKibana();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');

  const handleSeed = useCallback(async () => {
    setStatus('loading');
    setResult('');
    try {
      const resp = await core.http.post<{
        success: boolean;
        indexed: number;
        failed: number;
        hours: number;
        topology: {
          clusters: number;
          nodes: number;
          namespaces: number;
          deployments: number;
          pods: number;
        };
      }>('/internal/streams/entity_centric_lab/seed_k8s_data', {
        body: JSON.stringify({ hours: 8, intervalMinutes: 5, deleteExisting: true }),
      });
      if (resp.success) {
        setStatus('success');
        setResult(
          `${resp.indexed.toLocaleString()} docs over ${resp.hours}h — ` +
            `${resp.topology.clusters} clusters, ${resp.topology.nodes} nodes, ` +
            `${resp.topology.namespaces} ns, ${resp.topology.deployments} deploys, ` +
            `${resp.topology.pods} pods`
        );
      } else {
        setStatus('error');
        setResult(`${resp.indexed} ok, ${resp.failed} failed`);
      }
    } catch (e) {
      setStatus('error');
      setResult(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [core.http]);

  return (
    <>
      <EuiHorizontalRule margin="s" />
      <EuiFormRow
        label="K8s dashboard data"
        fullWidth
        helpText={
          result ? (
            <EuiText size="xs" color={status === 'error' ? 'danger' : 'success'}>
              <p>{result}</p>
            </EuiText>
          ) : (
            <EuiText size="xs" color="subdued">
              <p>Seeds K8s resources with active alerts, including deployments.</p>
            </EuiText>
          )
        }
      >
        <EuiButton
          size="s"
          fullWidth
          iconType="importAction"
          isLoading={status === 'loading'}
          color={status === 'success' ? 'success' : 'primary'}
          onClick={handleSeed}
        >
          {status === 'loading'
            ? 'Seeding…'
            : status === 'success'
            ? 'Seeded ✓'
            : 'Seed demo data'}
        </EuiButton>
      </EuiFormRow>
    </>
  );
};

// ---------------------------------------------------------------------------
// Reset prototype state
// ---------------------------------------------------------------------------

/**
 * Purge all prototype-owned localStorage and sessionStorage keys, then
 * hard-reload. Every key we write is prefixed with `entityCentricLab.`,
 * `entityCentricLab_`, or `elasticOn_`, so the wipe is surgical.
 */
const resetPrototypeState = (): void => {
  const prefixes = ['entityCentricLab.', 'entityCentricLab_', 'elasticOn_'];
  const isOurs = (key: string) => prefixes.some((p) => key.startsWith(p));
  try {
    const lsKeys = Object.keys(localStorage).filter(isOurs);
    for (const key of lsKeys) localStorage.removeItem(key);
    const ssKeys = Object.keys(sessionStorage).filter(isOurs);
    for (const key of ssKeys) sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable — the reload will still help.
  }
  window.location.reload();
};

const ResetPrototypeStateButton = () => (
  <>
    <EuiHorizontalRule margin="s" />
    <EuiFormRow
      label="Prototype state"
      fullWidth
      helpText={
        <EuiText size="xs" color="subdued">
          <p>Clears lab storage (saved views, tour flags, scenario progress) and reloads.</p>
        </EuiText>
      }
    >
      <EuiButton
        size="s"
        fullWidth
        iconType="refresh"
        color="text"
        onClick={resetPrototypeState}
        data-test-subj="entityCentricLabResetPrototypeState"
      >
        Reset prototype state
      </EuiButton>
    </EuiFormRow>
  </>
);

// ---------------------------------------------------------------------------
// About tab
// ---------------------------------------------------------------------------

const formatChangelogDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

const AboutPrototypePanel = () => (
  <EuiFlexGroup
    direction="column"
    gutterSize="m"
    css={css`
      flex: 1 1 auto;
      height: 100%;
      min-height: 0;
    `}
  >
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <p>
          <strong>This is a DESIGN prototype.</strong>
        </p>
        <p>
          Disclaimer: it uses an outdated version of Kibana so may not come with the latest
          and greatest components (flyout, banners). Use the latest version in the
          production code. If any ambiguity, please ask me (Nico).
        </p>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiHorizontalRule margin="none" />
    </EuiFlexItem>
    <EuiFlexItem
      grow={true}
      css={css`
        min-height: 0;
        display: flex;
        flex-direction: column;
      `}
    >
      <EuiText size="s">
        <strong>Change log</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <div
        css={css`
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          {PROTOTYPE_CHANGELOG.map((entry) => (
            <EuiFlexItem key={`${entry.date}-${entry.summary}`} grow={false}>
              <EuiText size="xs">
                <p css={css`margin-bottom: 0;`}>
                  <strong>{formatChangelogDate(entry.date)}</strong>
                  {' — '}
                  {entry.summary}
                </p>
              </EuiText>
              {entry.details ? (
                <EuiText size="xs" color="subdued">
                  <p css={css`margin-bottom: 0; margin-top: 2px;`}>{entry.details}</p>
                </EuiText>
              ) : null}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiFlexItem>
  </EuiFlexGroup>
);

// ---------------------------------------------------------------------------
// Floating switcher button + popover
// ---------------------------------------------------------------------------

export const VariationSwitcher = () => {
  const { euiTheme } = useEuiTheme();
  const { get, set, isAtDefault, dimensions } = useVariationContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<PopoverTabId>('settings');

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Highlight the button when any dimension is non-default, so the user
  // knows the prototype is in a non-standard configuration.
  const hasNonDefault = dimensions.some((dim) => !isAtDefault(dim.id));

  return (
    <div
      css={css`
        position: fixed;
        bottom: ${euiTheme.size.l};
        right: ${euiTheme.size.l};
        z-index: ${euiTheme.levels.flyout - 1};
      `}
    >
      <EuiPopover
        button={
          <EuiButtonIcon
            iconType="beaker"
            aria-label="Prototype variations"
            display={hasNonDefault ? 'fill' : 'base'}
            color={hasNonDefault ? 'accent' : 'text'}
            size="m"
            onClick={toggle}
            css={css`
              border-radius: 50%;
              box-shadow: ${euiTheme.levels.flyout > 0
                ? `0 2px 8px ${euiTheme.colors.shadow}`
                : 'none'};
            `}
          />
        }
        isOpen={isOpen}
        closePopover={close}
        anchorPosition="upRight"
        panelPaddingSize="m"
        css={css`
          & .euiPopover__anchor {
            display: flex;
          }
        `}
      >
        <div
          css={css`
            min-width: 280px;
          `}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={true}>
              <EuiTabs size="s" bottomBorder={false}>
                <EuiTab
                  isSelected={selectedTab === 'settings'}
                  onClick={() => setSelectedTab('settings')}
                  data-test-subj="entityCentricLabPrototypeSettingsTab"
                >
                  Prototype settings
                </EuiTab>
                <EuiTab
                  isSelected={selectedTab === 'about'}
                  onClick={() => setSelectedTab('about')}
                  data-test-subj="entityCentricLabAboutPrototypeTab"
                >
                  About the prototype
                </EuiTab>
              </EuiTabs>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <span data-test-subj="entityCentricLabPrototypeVersion">
                  v{PROTOTYPE_VERSION}
                </span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="s" />
          <EuiSpacer size="s" />
          {/* Settings drives width/height; About overlays so it cannot widen the panel. */}
          <div
            css={css`
              position: relative;
            `}
          >
            <div
              hidden={selectedTab !== 'settings'}
              css={css`
                &[hidden] {
                  display: block !important;
                  visibility: hidden;
                  pointer-events: none;
                }
              `}
            >
              <EuiFlexGroup direction="column" gutterSize="m">
                {dimensions.map((dim) => (
                  <EuiFlexItem key={dim.id} grow={false}>
                    <DimensionRow
                      dimension={dim}
                      activeOptionId={get(dim.id)}
                      onChange={set}
                    />
                  </EuiFlexItem>
                ))}
                <EuiFlexItem grow={false}>
                  <SeedDemoDataButton />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ResetPrototypeStateButton />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
            <div
              hidden={selectedTab !== 'about'}
              css={css`
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                min-height: 0;
                overflow: hidden;
                &[hidden] {
                  display: flex !important;
                  visibility: hidden;
                  pointer-events: none;
                }
              `}
            >
              <AboutPrototypePanel />
            </div>
          </div>
        </div>
      </EuiPopover>
    </div>
  );
};
