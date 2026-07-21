/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
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
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityCategoryId } from './fake_entities';
import { getCategoryDescriptor } from './fake_entities';
import {
  MONITORING_ASSET_TYPES,
  getCategoryMonitoringAssets,
  type InstalledAsset,
  type MonitoringAssetType,
  type RecommendedAsset,
} from './monitoring_assets';
import {
  getCategorySignals,
  type CategoryAlertRow,
  type CategoryDataStreamRow,
  type CategorySloRow,
  type DataStreamQuality,
  type SignalSeverity,
} from './category_signals';
import { useKibana } from '../../../hooks/use_kibana';

/**
 * Short section keys used by the URL hash for deep-linking from the
 * All entities Summary tiles into a specific block on the per-category
 * Overview page (e.g. `/entities/kubernetes#alerts` scrolls the user
 * straight to Active alerts). Kept as a small, stable map so callers
 * don't hard-code the accordion DOM ids and rename regressions become
 * a type error rather than a silent broken anchor.
 */
export const OVERVIEW_SECTION_HASHES = {
  alerts: 'alerts',
  slos: 'slos',
  streams: 'streams',
  installed: 'installed',
  recommended: 'recommended',
} as const;

export type OverviewSectionHash =
  (typeof OVERVIEW_SECTION_HASHES)[keyof typeof OVERVIEW_SECTION_HASHES];

/**
 * Maps each section hash to the DOM id `EuiAccordion` renders on its
 * outer wrapper — that's the element we `scrollIntoView` when the URL
 * hash matches.
 */
const OVERVIEW_SECTION_DOM_IDS: Record<OverviewSectionHash, string> = {
  alerts: 'entityCentricLabCategoryOverviewAlertsSection',
  slos: 'entityCentricLabCategoryOverviewSlosSection',
  streams: 'entityCentricLabCategoryOverviewStreamsSection',
  installed: 'entityCentricLabMonitoringAssetsInstalledSection',
  recommended: 'entityCentricLabMonitoringAssetsRecommendedSection',
};

/**
 * Type guard for a raw string coming from `location.hash`. Only the
 * short keys defined above are honoured — any other hash is ignored
 * (silent no-op, no console noise), which keeps random hashes safe.
 */
const isOverviewSectionHash = (value: string): value is OverviewSectionHash =>
  value in OVERVIEW_SECTION_HASHES;

/**
 * Presentation mode for each of the five overview blocks (Alerts,
 * SLOs, Data streams, Installed assets, Recommended assets).
 *
 * - `'collapsible'` (default) — each block is its own `EuiAccordion`
 *   inside a bordered panel. Used on per-category pages where the
 *   overview is the whole tab body.
 * - `'plain'` — each block is a bordered panel with a plain header
 *   (no chevron). Used inside the cross-category All entities overview
 *   where the *category* itself is the collapsible unit; nesting an
 *   accordion inside an accordion would double the click cost to reach
 *   a table row.
 */
export type SectionVariant = 'collapsible' | 'plain';

// Threaded through React context so we don't have to add a `variant`
// prop to every internal section (there are five of them, each with a
// different data shape). Default is 'collapsible' so callers that don't
// wrap in the provider keep the per-category page's original UX.
const SectionVariantContext = createContext<SectionVariant>('collapsible');

interface Props {
  readonly category: EntityCategoryId;
  /**
   * Opens the shared entity flyout for the clicked entity. Wired from
   * `AllEntitiesView` — same callback the grouped grid / list / geomap
   * use, so the flyout's parent/child slot bookkeeping stays coherent
   * regardless of which surface the user clicked from.
   */
  readonly onSelectEntity?: (entityName: string) => void;
  /**
   * How each of the five internal blocks (Alerts, SLOs, …) should
   * render. Defaults to `'collapsible'`. Pass `'plain'` when this view
   * is embedded inside an outer collapsible section (the All entities
   * overview groups each category under its own accordion).
   */
  readonly sectionVariant?: SectionVariant;
  /**
   * When true, skip the small intro paragraph at the top of the view.
   * Set by callers that already frame the view themselves — e.g. the
   * All entities overview labels each category via its own outer
   * accordion header, so per-category intros would just add noise.
   */
  readonly hideIntro?: boolean;
  /**
   * Overrides the label used in the intro and every section title
   * (e.g. `AWS`, `AWS · EC2`). Lets the Cloud provider / service pages
   * reuse the category overview while reading as scoped to the picked
   * provider/service. Falls back to the category label when omitted.
   */
  readonly scopeLabel?: string;
  /**
   * When set, narrows the Data streams block to rows whose name
   * contains this substring (e.g. `aws.` for the AWS page, `aws.ec2`
   * for the EC2 page). Alerts / SLOs / assets are category-level mock
   * data with no provider dimension, so only the streams block scopes.
   */
  readonly dataStreamNameIncludes?: string;
}

const AssetTypeBadge = ({ type }: { type: MonitoringAssetType }) => {
  const descriptor = MONITORING_ASSET_TYPES[type];
  return (
    <EuiBadge color="hollow" iconType={descriptor.icon}>
      {descriptor.label}
    </EuiBadge>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiTitle size="xs">
    <h3>{children}</h3>
  </EuiTitle>
);

/**
 * Semantic colour of a count-badge placed next to a section title.
 * Constrained so callers can't stray into arbitrary EUI colour strings —
 * we want alerts red, breaching SLOs amber, and neutral counts hollow,
 * and nothing else.
 */
type CountBadgeColor = 'danger' | 'warning' | 'success' | 'hollow';

interface CollapsibleSectionProps {
  /** Stable id — `EuiAccordion` uses it for its own toggle button aria wiring. */
  readonly id: string;
  /** Section heading rendered next to the accordion chevron. */
  readonly title: React.ReactNode;
  /** Optional pill with the row count. Colour is capped by {@link CountBadgeColor}. */
  readonly count?: { readonly value: number; readonly color?: CountBadgeColor };
  /** One-liner shown between the title and the extraAction (subdued text). */
  readonly subtitle?: React.ReactNode;
  /** Right-aligned action slot — e.g. an "Open in Alerts" empty button. */
  readonly extraAction?: React.ReactNode;
  /** Whether the section starts open. Defaults to `true`. */
  readonly initialIsOpen?: boolean;
  readonly children: React.ReactNode;
  readonly 'data-test-subj'?: string;
}

/**
 * Standard collapsible section wrapper for the overview tab. Reads the
 * ambient {@link SectionVariantContext} so callers can flip an entire
 * subtree between the two visual modes without touching individual
 * section renderings.
 *
 * - `'collapsible'` (default): `EuiAccordion` inside an `EuiPanel` —
 *   each block reads as a card the user can expand / collapse. Used
 *   on per-category pages where the overview *is* the tab body.
 * - `'plain'`: same `EuiPanel` + header layout minus the accordion —
 *   used when the whole view is already nested inside an outer
 *   collapsible (see `AllEntitiesOverviewView`), so the block content
 *   is always shown and the chevron double-nesting is avoided.
 *
 * Exported so the All entities overview can reuse the same panel /
 * header composition for the outer per-category accordion.
 */
export const CollapsibleSection = ({
  id,
  title,
  count,
  subtitle,
  extraAction,
  initialIsOpen = true,
  children,
  'data-test-subj': dataTestSubj,
}: CollapsibleSectionProps) => {
  const variant = useContext(SectionVariantContext);
  const buttonContent = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <SectionTitle>{title}</SectionTitle>
      </EuiFlexItem>
      {count ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color={count.color ?? 'hollow'}>{count.value.toLocaleString()}</EuiBadge>
        </EuiFlexItem>
      ) : null}
      {subtitle ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {subtitle}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );

  if (variant === 'plain') {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj={dataTestSubj}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem>{buttonContent}</EuiFlexItem>
          {extraAction ? <EuiFlexItem grow={false}>{extraAction}</EuiFlexItem> : null}
        </EuiFlexGroup>
        {children}
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj={dataTestSubj}>
      <EuiAccordion
        id={id}
        initialIsOpen={initialIsOpen}
        buttonContent={buttonContent}
        // `extraAction` sits *outside* the accordion's toggle button, so
        // clicking "Open in ..." doesn't accidentally collapse the panel.
        extraAction={extraAction}
        paddingSize="s"
        arrowDisplay="left"
      >
        {children}
      </EuiAccordion>
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// Active alerts
// ---------------------------------------------------------------------------

// EUI severity tone per alert severity — same mapping the flyout's
// Alerts tab uses, so the same "Critical / High / Medium / Low"
// language reads consistently across every entity-centric surface.
const SEVERITY_TO_COLOR: Record<SignalSeverity, string> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'subdued',
};

const SEVERITY_LABEL: Record<SignalSeverity, string> = {
  critical: i18n.translate('xpack.streams.entityCentricLab.categoryOverview.severity.critical', {
    defaultMessage: 'Critical',
  }),
  high: i18n.translate('xpack.streams.entityCentricLab.categoryOverview.severity.high', {
    defaultMessage: 'High',
  }),
  medium: i18n.translate('xpack.streams.entityCentricLab.categoryOverview.severity.medium', {
    defaultMessage: 'Medium',
  }),
  low: i18n.translate('xpack.streams.entityCentricLab.categoryOverview.severity.low', {
    defaultMessage: 'Low',
  }),
};

const ActiveAlertsSection = ({
  alerts,
  categoryLabel,
  prependBasePath,
  onSelectEntity,
}: {
  alerts: readonly CategoryAlertRow[];
  categoryLabel: string;
  prependBasePath: (path: string) => string;
  onSelectEntity?: (entityName: string) => void;
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<CategoryAlertRow>>>(
    () => [
      {
        field: 'severity',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.alerts.columns.severity',
          { defaultMessage: 'Severity' }
        ),
        width: '110px',
        render: (severity: SignalSeverity) => (
          <EuiHealth color={SEVERITY_TO_COLOR[severity]}>{SEVERITY_LABEL[severity]}</EuiHealth>
        ),
      },
      {
        field: 'rule',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.alerts.columns.rule',
          { defaultMessage: 'Rule' }
        ),
        render: (rule: string, row: CategoryAlertRow) => (
          <EuiLink href={prependBasePath(row.detailsPath)}>{rule}</EuiLink>
        ),
      },
      {
        field: 'entityName',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.alerts.columns.entity',
          { defaultMessage: 'Entity' }
        ),
        width: '260px',
        // Entity cell opens the shared flyout when a handler is wired
        // (`AllEntitiesView` always wires one), so alerts read as a
        // gateway into the entity's context rather than a dead
        // reference. When no handler is provided (defensive: the view
        // is technically reusable outside `AllEntitiesView`) we fall
        // back to plain truncated text so the row still renders.
        render: (entityName: string) => {
          if (!onSelectEntity) {
            return (
              <EuiText size="s" className="eui-textTruncate">
                {entityName}
              </EuiText>
            );
          }
          return (
            <EuiLink
              onClick={() => onSelectEntity(entityName)}
              data-test-subj="entityCentricLabCategoryOverviewAlertsEntityLink"
            >
              <EuiText size="s" className="eui-textTruncate">
                {entityName}
              </EuiText>
            </EuiLink>
          );
        },
      },
      {
        field: 'reason',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.alerts.columns.reason',
          { defaultMessage: 'Reason' }
        ),
        render: (reason: string) => (
          <EuiText size="s" color="subdued">
            {reason}
          </EuiText>
        ),
      },
      {
        field: 'triggeredAt',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.alerts.columns.triggeredAt',
          { defaultMessage: 'Triggered' }
        ),
        width: '110px',
        render: (triggeredAt: string) => (
          <EuiText size="s" color="subdued">
            {triggeredAt}
          </EuiText>
        ),
      },
    ],
    [prependBasePath, onSelectEntity]
  );

  return (
    <CollapsibleSection
      id={OVERVIEW_SECTION_DOM_IDS.alerts}
      data-test-subj="entityCentricLabCategoryOverviewAlertsPanel"
      title={i18n.translate('xpack.streams.entityCentricLab.categoryOverview.alerts.title', {
        defaultMessage: 'Active alerts on {categoryLabel} entities',
        values: { categoryLabel },
      })}
      count={{ value: alerts.length, color: alerts.length > 0 ? 'danger' : 'hollow' }}
      extraAction={
        <EuiButtonEmpty
          size="xs"
          iconType="popout"
          href={prependBasePath('/app/observability/alerts')}
          data-test-subj="entityCentricLabCategoryOverviewAlertsOpen"
        >
          {i18n.translate('xpack.streams.entityCentricLab.categoryOverview.alerts.openAll', {
            defaultMessage: 'Open in Alerts',
          })}
        </EuiButtonEmpty>
      }
    >
      <EuiSpacer size="s" />
      {alerts.length === 0 ? (
        // Match the Recommended-assets "all clear" prompt: bold green
        // filled check reads as "positive / nothing to do" and stays
        // visually consistent across the three empty states in the
        // overview.
        <EuiEmptyPrompt
          iconType="checkInCircleFilled"
          iconColor="success"
          titleSize="xxs"
          title={
            <h4>
              {i18n.translate('xpack.streams.entityCentricLab.categoryOverview.alerts.empty', {
                defaultMessage: 'No active alerts',
              })}
            </h4>
          }
        />
      ) : (
        <EuiInMemoryTable<CategoryAlertRow>
          tableCaption={i18n.translate(
            'xpack.streams.entityCentricLab.categoryOverview.alerts.caption',
            { defaultMessage: 'Active alerts scoped to {categoryLabel}', values: { categoryLabel } }
          )}
          items={[...alerts]}
          columns={columns}
          rowHeader="rule"
          data-test-subj="entityCentricLabCategoryOverviewAlertsTable"
        />
      )}
    </CollapsibleSection>
  );
};

// ---------------------------------------------------------------------------
// Breaching SLOs
// ---------------------------------------------------------------------------

const budgetTone = (remainingBudgetPct: number): { color: string; label: string } => {
  if (remainingBudgetPct < 10) {
    return {
      color: 'danger',
      label: i18n.translate('xpack.streams.entityCentricLab.categoryOverview.slos.budget.danger', {
        defaultMessage: '{pct}% left',
        values: { pct: remainingBudgetPct },
      }),
    };
  }
  if (remainingBudgetPct < 30) {
    return {
      color: 'warning',
      label: i18n.translate('xpack.streams.entityCentricLab.categoryOverview.slos.budget.warning', {
        defaultMessage: '{pct}% left',
        values: { pct: remainingBudgetPct },
      }),
    };
  }
  return {
    color: 'success',
    label: i18n.translate('xpack.streams.entityCentricLab.categoryOverview.slos.budget.good', {
      defaultMessage: '{pct}% left',
      values: { pct: remainingBudgetPct },
    }),
  };
};

const BreachingSlosSection = ({
  slos,
  categoryLabel,
  prependBasePath,
}: {
  slos: readonly CategorySloRow[];
  categoryLabel: string;
  prependBasePath: (path: string) => string;
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<CategorySloRow>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.entityCentricLab.categoryOverview.slos.columns.name', {
          defaultMessage: 'SLO',
        }),
        render: (name: string, row: CategorySloRow) => (
          <EuiLink href={prependBasePath(row.sloLink)}>{name}</EuiLink>
        ),
      },
      {
        field: 'objective',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.slos.columns.objective',
          { defaultMessage: 'Objective' }
        ),
        render: (objective: string) => (
          <EuiText size="s" color="subdued">
            {objective}
          </EuiText>
        ),
      },
      {
        field: 'burnRateX',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.slos.columns.burnRate',
          { defaultMessage: 'Burn rate' }
        ),
        width: '120px',
        sortable: true,
        render: (burnRateX: number) => (
          <EuiBadge color={burnRateX >= 4 ? 'danger' : burnRateX >= 2 ? 'warning' : 'hollow'}>
            {i18n.translate('xpack.streams.entityCentricLab.categoryOverview.slos.burnRateBadge', {
              defaultMessage: '{multiple}× budget',
              values: { multiple: burnRateX.toFixed(1) },
            })}
          </EuiBadge>
        ),
      },
      {
        field: 'remainingBudgetPct',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.slos.columns.budget',
          { defaultMessage: 'Error budget' }
        ),
        width: '130px',
        sortable: true,
        render: (remainingBudgetPct: number) => {
          const tone = budgetTone(remainingBudgetPct);
          return <EuiHealth color={tone.color}>{tone.label}</EuiHealth>;
        },
      },
      {
        field: 'apmServiceName',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.slos.columns.apmService',
          { defaultMessage: 'APM service' }
        ),
        width: '220px',
        render: (apmServiceName: string, row: CategorySloRow) => (
          <EuiToolTip
            content={i18n.translate(
              'xpack.streams.entityCentricLab.categoryOverview.slos.apmLinkTooltip',
              {
                defaultMessage: 'Open {service} in APM',
                values: { service: apmServiceName },
              }
            )}
          >
            <EuiLink href={prependBasePath(row.apmLink)}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="apmApp" size="s" aria-hidden />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{apmServiceName}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiLink>
          </EuiToolTip>
        ),
      },
    ],
    [prependBasePath]
  );

  return (
    <CollapsibleSection
      id={OVERVIEW_SECTION_DOM_IDS.slos}
      data-test-subj="entityCentricLabCategoryOverviewSlosPanel"
      title={i18n.translate('xpack.streams.entityCentricLab.categoryOverview.slos.title', {
        defaultMessage: 'Breaching SLOs',
      })}
      count={{ value: slos.length, color: slos.length > 0 ? 'warning' : 'hollow' }}
      subtitle={i18n.translate('xpack.streams.entityCentricLab.categoryOverview.slos.subtitle', {
        defaultMessage: 'Backed by {categoryLabel} entities — jump into APM for the tied service.',
        values: { categoryLabel },
      })}
      extraAction={
        <EuiButtonEmpty
          size="xs"
          iconType="popout"
          href={prependBasePath('/app/slo')}
          data-test-subj="entityCentricLabCategoryOverviewSlosOpen"
        >
          {i18n.translate('xpack.streams.entityCentricLab.categoryOverview.slos.openAll', {
            defaultMessage: 'Open in SLOs',
          })}
        </EuiButtonEmpty>
      }
    >
      <EuiSpacer size="s" />
      {slos.length === 0 ? (
        // See the Alerts empty-state note: keep the "all clear" prompts
        // (Alerts, SLOs, Recommended) on the same green filled check so
        // they don't read as three different levels of "OK".
        <EuiEmptyPrompt
          iconType="checkInCircleFilled"
          iconColor="success"
          titleSize="xxs"
          title={
            <h4>
              {i18n.translate('xpack.streams.entityCentricLab.categoryOverview.slos.empty', {
                defaultMessage: 'No SLOs currently breaching',
              })}
            </h4>
          }
        />
      ) : (
        <EuiInMemoryTable<CategorySloRow>
          tableCaption={i18n.translate(
            'xpack.streams.entityCentricLab.categoryOverview.slos.caption',
            {
              defaultMessage:
                'SLOs backed by {categoryLabel} entities that are burning error budget too fast',
              values: { categoryLabel },
            }
          )}
          items={[...slos]}
          columns={columns}
          sorting={{ sort: { field: 'burnRateX', direction: 'desc' } }}
          rowHeader="name"
          data-test-subj="entityCentricLabCategoryOverviewSlosTable"
        />
      )}
    </CollapsibleSection>
  );
};

// ---------------------------------------------------------------------------
// Data streams & quality
// ---------------------------------------------------------------------------

const QUALITY_TO_COLOR: Record<DataStreamQuality, string> = {
  good: 'success',
  warning: 'warning',
  critical: 'danger',
};

const QUALITY_LABEL: Record<DataStreamQuality, string> = {
  good: i18n.translate('xpack.streams.entityCentricLab.categoryOverview.streams.quality.good', {
    defaultMessage: 'Good',
  }),
  warning: i18n.translate(
    'xpack.streams.entityCentricLab.categoryOverview.streams.quality.warning',
    { defaultMessage: 'Degraded' }
  ),
  critical: i18n.translate(
    'xpack.streams.entityCentricLab.categoryOverview.streams.quality.critical',
    { defaultMessage: 'Critical' }
  ),
};

const DataStreamsSection = ({
  streams,
  categoryLabel,
  prependBasePath,
}: {
  streams: readonly CategoryDataStreamRow[];
  categoryLabel: string;
  prependBasePath: (path: string) => string;
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<CategoryDataStreamRow>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.streams.columns.name',
          { defaultMessage: 'Data stream' }
        ),
        render: (name: string, row: CategoryDataStreamRow) => (
          <EuiLink href={prependBasePath(row.qualityLink)}>
            <EuiText size="s">{name}</EuiText>
          </EuiLink>
        ),
      },
      {
        field: 'docCount',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.streams.columns.docCount',
          { defaultMessage: 'Docs' }
        ),
        width: '110px',
        render: (docCount: string) => (
          <EuiText size="s" color="subdued">
            {docCount}
          </EuiText>
        ),
      },
      {
        field: 'quality',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.streams.columns.quality',
          { defaultMessage: 'Quality' }
        ),
        width: '260px',
        render: (quality: DataStreamQuality, row: CategoryDataStreamRow) => (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              <EuiHealth color={QUALITY_TO_COLOR[quality]}>{QUALITY_LABEL[quality]}</EuiHealth>
            </EuiFlexItem>
            {row.qualityReason ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {row.qualityReason}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'lastUpdate',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.categoryOverview.streams.columns.lastUpdate',
          { defaultMessage: 'Last document' }
        ),
        width: '130px',
        render: (lastUpdate: string) => (
          <EuiText size="s" color="subdued">
            {lastUpdate}
          </EuiText>
        ),
      },
    ],
    [prependBasePath]
  );

  return (
    <CollapsibleSection
      id={OVERVIEW_SECTION_DOM_IDS.streams}
      data-test-subj="entityCentricLabCategoryOverviewStreamsPanel"
      title={i18n.translate('xpack.streams.entityCentricLab.categoryOverview.streams.title', {
        defaultMessage: 'Data streams for {categoryLabel}',
        values: { categoryLabel },
      })}
      count={{ value: streams.length }}
      extraAction={
        <EuiButtonEmpty
          size="xs"
          iconType="popout"
          href={prependBasePath('/app/management/data/data_quality')}
          data-test-subj="entityCentricLabCategoryOverviewStreamsOpen"
        >
          {i18n.translate('xpack.streams.entityCentricLab.categoryOverview.streams.openAll', {
            defaultMessage: 'Open Dataset Quality',
          })}
        </EuiButtonEmpty>
      }
    >
      <EuiSpacer size="s" />
      {streams.length === 0 ? (
        <EuiEmptyPrompt
          iconType="database"
          titleSize="xxs"
          title={
            <h4>
              {i18n.translate('xpack.streams.entityCentricLab.categoryOverview.streams.empty', {
                defaultMessage: 'No known data streams',
              })}
            </h4>
          }
        />
      ) : (
        <EuiInMemoryTable<CategoryDataStreamRow>
          tableCaption={i18n.translate(
            'xpack.streams.entityCentricLab.categoryOverview.streams.caption',
            {
              defaultMessage:
                'Data streams backing {categoryLabel} entities, with their ingest quality',
              values: { categoryLabel },
            }
          )}
          items={[...streams]}
          columns={columns}
          rowHeader="name"
          data-test-subj="entityCentricLabCategoryOverviewStreamsTable"
        />
      )}
    </CollapsibleSection>
  );
};

// ---------------------------------------------------------------------------
// Monitoring assets (existing)
// ---------------------------------------------------------------------------

const InstalledAssetsSection = ({ assets }: { assets: readonly InstalledAsset[] }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<InstalledAsset>>>(
    () => [
      {
        field: 'type',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.columns.type',
          { defaultMessage: 'Type' }
        ),
        width: '150px',
        render: (type: MonitoringAssetType) => <AssetTypeBadge type={type} />,
      },
      {
        field: 'name',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.columns.name',
          { defaultMessage: 'Name' }
        ),
        render: (name: string) => <EuiLink>{name}</EuiLink>,
      },
      {
        field: 'integration',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.columns.integration',
          { defaultMessage: 'Source' }
        ),
        width: '180px',
        render: (integration: string) => <EuiBadge color="hollow">{integration}</EuiBadge>,
      },
      {
        field: 'updatedAt',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.columns.updatedAt',
          { defaultMessage: 'Last updated' }
        ),
        width: '140px',
        render: (updatedAt: string) => (
          <EuiText size="s" color="subdued">
            {updatedAt}
          </EuiText>
        ),
      },
    ],
    []
  );

  return (
    <CollapsibleSection
      id={OVERVIEW_SECTION_DOM_IDS.installed}
      data-test-subj="entityCentricLabMonitoringAssetsInstalledPanel"
      title={i18n.translate('xpack.streams.entityCentricLab.monitoringAssets.installed.title', {
        defaultMessage: 'Installed monitoring assets',
      })}
      count={{ value: assets.length }}
    >
      <EuiSpacer size="s" />
      <EuiInMemoryTable<InstalledAsset>
        tableCaption={i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.caption',
          { defaultMessage: 'Monitoring assets already installed' }
        )}
        items={[...assets]}
        columns={columns}
        rowHeader="name"
        data-test-subj="entityCentricLabMonitoringAssetsInstalledTable"
      />
    </CollapsibleSection>
  );
};

const RecommendedAssetsSection = ({
  assets,
  integration,
}: {
  assets: readonly RecommendedAsset[];
  integration: string;
}) => (
  <CollapsibleSection
    id={OVERVIEW_SECTION_DOM_IDS.recommended}
    data-test-subj="entityCentricLabMonitoringAssetsRecommendedPanel"
    // Kept open by default alongside the other overview sections so the
    // "install this next" cards are discoverable without an extra click.
    // (`CollapsibleSection` defaults `initialIsOpen` to true; leaving it
    // implicit here matches the four sections above.)
    title={i18n.translate('xpack.streams.entityCentricLab.monitoringAssets.recommended.title', {
      defaultMessage: 'Recommended monitoring assets to install',
    })}
    count={{ value: assets.length }}
    subtitle={i18n.translate(
      'xpack.streams.entityCentricLab.monitoringAssets.recommended.subtitle',
      {
        defaultMessage: 'Curated from the {integration} integration',
        values: { integration },
      }
    )}
  >
    <EuiSpacer size="m" />
    {assets.length === 0 ? (
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        iconColor="success"
        titleSize="xxs"
        title={
          <h4>
            {i18n.translate(
              'xpack.streams.entityCentricLab.monitoringAssets.recommended.emptyTitle',
              {
                defaultMessage: 'Everything from {integration} is installed',
                values: { integration },
              }
            )}
          </h4>
        }
        body={i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.recommended.emptyBody',
          {
            defaultMessage:
              'No new dashboards, rules or SLOs to suggest for this category right now.',
          }
        )}
      />
    ) : (
      <EuiFlexGrid columns={3} gutterSize="m">
        {assets.map((asset) => (
          <EuiFlexItem key={asset.id}>
            <EuiCard
              icon={<EuiIcon type={MONITORING_ASSET_TYPES[asset.type].icon} size="xl" />}
              titleSize="xs"
              title={asset.name}
              description={asset.description}
              betaBadgeProps={{ label: MONITORING_ASSET_TYPES[asset.type].label }}
              footer={
                <EuiButton
                  size="s"
                  iconType="plusInCircle"
                  data-test-subj={`entityCentricLabMonitoringAssetsInstall-${asset.id}`}
                >
                  {i18n.translate(
                    'xpack.streams.entityCentricLab.monitoringAssets.recommended.install',
                    { defaultMessage: 'Install' }
                  )}
                </EuiButton>
              }
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    )}
  </CollapsibleSection>
);

/**
 * Category overview tab body — renders five stacked blocks driven by
 * the category's mock signals + integration bundle:
 *   1. Active alerts firing on entities of this category.
 *   2. SLOs backed by this category's entities that are burning error
 *      budget, each with a jump-to-APM shortcut for the tied service.
 *   3. Data streams that feed this category, with their ingest / mapping
 *      quality and a link to Dataset Quality for the details.
 *   4. Monitoring assets (dashboards, rules, SLOs, …) already installed.
 *   5. Recommended monitoring assets curated from the integration.
 *
 * The component is used from `AllEntitiesView` when the user picks the
 * "Overview" tab on a category page; the cross-category `/entities` page
 * doesn't render it (signals and assets are only meaningful when scoped
 * to a single category).
 */
export const MonitoringAssetsView = ({
  category,
  onSelectEntity,
  sectionVariant = 'collapsible',
  hideIntro = false,
  scopeLabel,
  dataStreamNameIncludes,
}: Props) => {
  const { integration, installed, recommended } = useMemo(
    () => getCategoryMonitoringAssets(category),
    [category]
  );
  const { activeAlerts, breachingSlos, dataStreams } = useMemo(
    () => getCategorySignals(category),
    [category]
  );
  // Prefer the caller-supplied scope label (e.g. `AWS · EC2`) so the
  // Cloud provider/service pages read as scoped; fall back to the
  // category label for the plain per-category pages.
  const categoryLabel = scopeLabel ?? getCategoryDescriptor(category)?.label ?? category;
  // Narrow the (category-level) data streams to the active provider /
  // service when a match hint is supplied. GCP / Azure have no seeded
  // streams, so their pages fall through to the empty state — which is
  // the honest signal for the mock dataset.
  const scopedDataStreams = useMemo(
    () =>
      dataStreamNameIncludes
        ? dataStreams.filter((row) => row.name.includes(dataStreamNameIncludes))
        : dataStreams,
    [dataStreams, dataStreamNameIncludes]
  );
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();
  const prependBasePath = React.useCallback((path: string) => basePath.prepend(path), [basePath]);

  // Deep-link support: the All entities Summary layout navigates to
  // `/entities/{category}#{section}` when the user clicks one of the
  // compact tiles. On mount, look up the section, scroll it into view
  // and give it a brief visual pulse so the user's eye lands on the
  // right block. Ignored (silently) for hashes we don't own.
  const { hash } = useLocation();
  useEffect(() => {
    if (sectionVariant !== 'collapsible') return;
    const raw = hash.replace(/^#/, '');
    if (!isOverviewSectionHash(raw)) return;
    // Wait one frame so the accordion has painted; scrolling to an
    // element that just mounted returns 0-height in some browsers.
    const timeout = window.setTimeout(() => {
      const el = document.getElementById(OVERVIEW_SECTION_DOM_IDS[raw]);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => window.clearTimeout(timeout);
    // Re-run when the hash changes (user clicks another tile while the
    // per-category page is already mounted).
  }, [hash, sectionVariant]);

  return (
    <SectionVariantContext.Provider value={sectionVariant}>
      <EuiFlexGroup direction="column" gutterSize="l">
        {hideIntro ? null : (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.entityCentricLab.categoryOverview.intro', {
                defaultMessage:
                  'Overview of {categoryLabel} entities: active alerts, breaching SLOs, ingest quality, and the monitoring assets shipped by the {integration} integration.',
                values: { categoryLabel, integration },
              })}
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <ActiveAlertsSection
            alerts={activeAlerts}
            categoryLabel={categoryLabel}
            prependBasePath={prependBasePath}
            onSelectEntity={onSelectEntity}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <BreachingSlosSection
            slos={breachingSlos}
            categoryLabel={categoryLabel}
            prependBasePath={prependBasePath}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DataStreamsSection
            streams={scopedDataStreams}
            categoryLabel={categoryLabel}
            prependBasePath={prependBasePath}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <InstalledAssetsSection assets={installed} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RecommendedAssetsSection assets={recommended} integration={integration} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SectionVariantContext.Provider>
  );
};
