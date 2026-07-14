/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  getCategorySignals,
  type CategoryAlertRow,
  type CategoryDataStreamRow,
  type CategorySloRow,
} from './category_signals';
import { ENTITY_CATEGORIES } from './fake_entities';
import type { EntityCategoryId } from './fake_entities';
import { getCategoryMonitoringAssets } from './monitoring_assets';
import {
  CollapsibleSection,
  MonitoringAssetsView,
  OVERVIEW_SECTION_HASHES,
  type OverviewSectionHash,
} from './monitoring_assets_view';

/**
 * Cross-category Overview shown on the `/entities` page. Supports two
 * layouts, user-selectable via a small `EuiButtonGroup` at the top-
 * right (persisted per-user in `localStorage`):
 *
 * - **Summary** (default): each category is a collapsible row with a
 *   compact strip of 5 count tiles (alerts, breaching SLOs, degraded
 *   streams, installed assets, recommended assets) + a "View details"
 *   link that drills into that category's dedicated page. Tiles are
 *   clickable — they navigate to the same page and deep-link (via URL
 *   hash) to the specific block. Optimised for "what's happening
 *   everywhere at a glance".
 * - **Full**: the previous behaviour — each category expands into the
 *   full stacked layout with tables for every block. Optimised for
 *   in-page triage without leaving `/entities`.
 *
 * The "Other" catch-all bucket is intentionally skipped: it's a
 * fallback container for user-typed categories, never a first-class
 * signal domain, and rendering it would clutter the page without
 * adding operational value.
 *
 * Ordering follows the `ENTITY_CATEGORIES` array so this view stays in
 * sync with the left-nav grouping (Hosts → Kubernetes → Databases → …)
 * without needing a separate ordering rule.
 */
const CATEGORIES_TO_SHOW: readonly EntityCategoryId[] = ENTITY_CATEGORIES.map(
  (category) => category.id
).filter((id): id is EntityCategoryId => id !== 'other');

type LayoutMode = 'summary' | 'full';
const LAYOUT_MODE_STORAGE_KEY = 'entityCentricLab.allEntitiesOverviewLayoutMode.v1';
const isLayoutMode = (value: string | null): value is LayoutMode =>
  value === 'summary' || value === 'full';

/**
 * Hydrate the layout preference from `localStorage`. Same pattern as
 * `useEntitiesViewMode` — SSR-safe (falls back to the default when
 * `window` is unavailable) and swallows storage exceptions (private
 * browsing mode, quota errors) instead of crashing the tab.
 */
const readInitialLayoutMode = (): LayoutMode => {
  if (typeof window === 'undefined') return 'summary';
  try {
    const stored = window.localStorage.getItem(LAYOUT_MODE_STORAGE_KEY);
    return isLayoutMode(stored) ? stored : 'summary';
  } catch {
    return 'summary';
  }
};

export interface AllEntitiesOverviewViewProps {
  /**
   * Forwarded to each embedded `MonitoringAssetsView` (Full layout) so
   * entity names in the aggregated Active Alerts tables open the
   * shared flyout — same callback path as the Inventory tab / grouped
   * grid.
   */
  readonly onSelectEntity?: (entityName: string) => void;
}

export const AllEntitiesOverviewView = ({ onSelectEntity }: AllEntitiesOverviewViewProps) => {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(readInitialLayoutMode);
  const setLayoutMode = useCallback((next: LayoutMode) => {
    setLayoutModeState(next);
    try {
      window.localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors — the preference is nice-to-have, not
      // load-bearing. Users just lose the memory on next visit.
    }
  }, []);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.entityCentricLab.allEntitiesOverview.intro', {
                defaultMessage:
                  'Aggregated overview across every entity category: alerts, breaching SLOs, ingest quality and monitoring assets, grouped by category.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              // Subtle small toggle — not `isIconOnly` so the labels
              // read straight without a tooltip. Two mutually-exclusive
              // options; single-select.
              legend={i18n.translate(
                'xpack.streams.entityCentricLab.allEntitiesOverview.layoutToggle.legend',
                { defaultMessage: 'Overview layout' }
              )}
              buttonSize="compressed"
              idSelected={layoutMode}
              onChange={(id) => setLayoutMode(id as LayoutMode)}
              options={[
                {
                  id: 'summary',
                  label: i18n.translate(
                    'xpack.streams.entityCentricLab.allEntitiesOverview.layoutToggle.summary',
                    { defaultMessage: 'Summary' }
                  ),
                },
                {
                  id: 'full',
                  label: i18n.translate(
                    'xpack.streams.entityCentricLab.allEntitiesOverview.layoutToggle.full',
                    { defaultMessage: 'Full' }
                  ),
                },
              ]}
              data-test-subj="entityCentricLabAllEntitiesOverviewLayoutToggle"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {layoutMode === 'summary' ? (
        <SummaryLayout />
      ) : (
        <FullLayout onSelectEntity={onSelectEntity} />
      )}
    </EuiFlexGroup>
  );
};

// --- Full layout (previous behaviour, unchanged) ---------------------

const FullLayout = ({ onSelectEntity }: AllEntitiesOverviewViewProps) => (
  <>
    {CATEGORIES_TO_SHOW.map((categoryId) => {
      const descriptor = ENTITY_CATEGORIES.find((category) => category.id === categoryId);
      if (!descriptor) return null;
      const title = (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={descriptor.icon} size="m" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span>{descriptor.label}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
      return (
        <EuiFlexItem grow={false} key={categoryId}>
          <CollapsibleSection
            id={`entityCentricLabAllEntitiesOverviewCategory-${categoryId}`}
            data-test-subj={`entityCentricLabAllEntitiesOverviewCategoryPanel-${categoryId}`}
            title={title}
            initialIsOpen={false}
          >
            <EuiSpacer size="s" />
            <MonitoringAssetsView
              category={categoryId}
              onSelectEntity={onSelectEntity}
              sectionVariant="plain"
              hideIntro
            />
          </CollapsibleSection>
        </EuiFlexItem>
      );
    })}
  </>
);

// --- Summary layout --------------------------------------------------

/**
 * Metadata for each summary tile: label + hash key that deep-links to
 * the target section on the per-category page. Tone is computed per
 * tile from the raw data (see `getCategoryTilesData`), not hard-coded
 * on the spec — so a tile can shift red → amber → green as the
 * underlying signal changes, and empty categories look reassuringly
 * healthy instead of "neutral grey".
 */
interface TileSpec {
  readonly key: OverviewSectionHash;
  readonly label: string;
}

const TILE_SPECS: readonly TileSpec[] = [
  {
    key: OVERVIEW_SECTION_HASHES.alerts,
    label: i18n.translate('xpack.streams.entityCentricLab.allEntitiesOverview.tiles.alerts', {
      defaultMessage: 'Alerts in alert',
    }),
  },
  {
    key: OVERVIEW_SECTION_HASHES.slos,
    label: i18n.translate('xpack.streams.entityCentricLab.allEntitiesOverview.tiles.slos', {
      defaultMessage: 'Breaching SLOs',
    }),
  },
  {
    key: OVERVIEW_SECTION_HASHES.streams,
    label: i18n.translate('xpack.streams.entityCentricLab.allEntitiesOverview.tiles.streams', {
      defaultMessage: 'Degraded streams',
    }),
  },
  {
    key: OVERVIEW_SECTION_HASHES.installed,
    label: i18n.translate('xpack.streams.entityCentricLab.allEntitiesOverview.tiles.installed', {
      defaultMessage: 'Installed assets',
    }),
  },
  {
    key: OVERVIEW_SECTION_HASHES.recommended,
    label: i18n.translate('xpack.streams.entityCentricLab.allEntitiesOverview.tiles.recommended', {
      defaultMessage: 'Recommended assets',
    }),
  },
];

interface TileData {
  readonly count: number;
  readonly tone: CardTone;
}

type CategoryTilesData = Record<OverviewSectionHash, TileData>;

// Tone helpers below — each maps the raw signal shape to one of the
// four card tones. Kept as small pure functions so it's obvious what
// drives a tile's colour (worst severity, not just count).

const resolveAlertsTone = (alerts: readonly CategoryAlertRow[]): CardTone => {
  if (alerts.length === 0) return 'active-healthy';
  const hasHot = alerts.some((alert) => alert.severity === 'critical' || alert.severity === 'high');
  return hasHot ? 'active-danger' : 'active-warning';
};

const resolveSlosTone = (slos: readonly CategorySloRow[]): CardTone => {
  if (slos.length === 0) return 'active-healthy';
  // Burn rate ≥ 4× exhausts a 30d budget in a week — that's a "wake
  // someone up" number; below that it's still a breach but not on fire.
  return slos.some((slo) => slo.burnRateX >= 4) ? 'active-danger' : 'active-warning';
};

const resolveStreamsTone = (streams: readonly CategoryDataStreamRow[]): CardTone => {
  if (streams.some((stream) => stream.quality === 'critical')) return 'active-danger';
  if (streams.some((stream) => stream.quality === 'warning')) return 'active-warning';
  return 'active-healthy';
};

const getCategoryTilesData = (categoryId: EntityCategoryId): CategoryTilesData => {
  const signals = getCategorySignals(categoryId);
  const assets = getCategoryMonitoringAssets(categoryId);
  // Degraded = anything worse than `good`. Matches the pill colouring
  // in the DataStreamsSection table so the count on the tile and the
  // rows in the drill-down can't disagree.
  const degradedStreams = signals.dataStreams.filter((stream) => stream.quality !== 'good');
  return {
    alerts: { count: signals.activeAlerts.length, tone: resolveAlertsTone(signals.activeAlerts) },
    slos: { count: signals.breachingSlos.length, tone: resolveSlosTone(signals.breachingSlos) },
    streams: { count: degradedStreams.length, tone: resolveStreamsTone(signals.dataStreams) },
    installed: {
      count: assets.installed.length,
      tone: assets.installed.length === 0 ? 'assets-empty' : 'assets',
    },
    recommended: {
      count: assets.recommended.length,
      tone: assets.recommended.length === 0 ? 'assets-empty' : 'assets',
    },
  };
};

const SummaryLayout = () => {
  const history = useHistory();

  // Route helper — bypasses the typed router (which doesn't model a
  // hash slot) so we can deep-link to a specific block inside the
  // per-category Overview page. Passing an empty hash for `View
  // details` clears any hash from a previous navigation, otherwise the
  // page would still auto-scroll to the last-clicked section.
  const goToCategory = useCallback(
    (categoryId: EntityCategoryId, section?: OverviewSectionHash) => {
      history.push({
        pathname: `/entities/${categoryId}`,
        hash: section ?? '',
      });
    },
    [history]
  );

  return (
    <>
      {CATEGORIES_TO_SHOW.map((categoryId) => {
        const descriptor = ENTITY_CATEGORIES.find((category) => category.id === categoryId);
        if (!descriptor) return null;
        return (
          <EuiFlexItem grow={false} key={categoryId}>
            <CategorySummaryRow
              categoryId={categoryId}
              descriptor={descriptor}
              onNavigate={goToCategory}
            />
          </EuiFlexItem>
        );
      })}
    </>
  );
};

const CategorySummaryRow = ({
  categoryId,
  descriptor,
  onNavigate,
}: {
  categoryId: EntityCategoryId;
  descriptor: (typeof ENTITY_CATEGORIES)[number];
  onNavigate: (categoryId: EntityCategoryId, section?: OverviewSectionHash) => void;
}) => {
  const tilesData = useMemo(() => getCategoryTilesData(categoryId), [categoryId]);

  const title = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={descriptor.icon} size="m" aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span>{descriptor.label}</span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const viewDetails = (
    <EuiButtonEmpty
      size="xs"
      iconType="popout"
      onClick={() => onNavigate(categoryId)}
      data-test-subj={`entityCentricLabAllEntitiesOverviewViewDetails-${categoryId}`}
    >
      {i18n.translate('xpack.streams.entityCentricLab.allEntitiesOverview.viewDetails', {
        defaultMessage: 'View details',
      })}
    </EuiButtonEmpty>
  );

  return (
    <CollapsibleSection
      id={`entityCentricLabAllEntitiesOverviewSummaryCategory-${categoryId}`}
      data-test-subj={`entityCentricLabAllEntitiesOverviewSummaryPanel-${categoryId}`}
      title={title}
      extraAction={viewDetails}
      // Summary rows start expanded — the tile strip is compact enough
      // to leave open for every category, and hiding it by default
      // would defeat the "everything at a glance" purpose.
      initialIsOpen
    >
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        {TILE_SPECS.map((spec) => (
          <EuiFlexItem key={spec.key} grow>
            <SummaryTile
              spec={spec}
              data={tilesData[spec.key]}
              onClick={() => onNavigate(categoryId, spec.key)}
              categoryId={categoryId}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </CollapsibleSection>
  );
};

// --- Sparkline + card internals -------------------------------------

/**
 * Tone the metric card should adopt. `active-*` tones apply to the
 * three signal tiles (Alerts, SLOs, Degraded streams) and are chosen
 * from the worst underlying severity — `active-healthy` (green) means
 * "nothing to see here", not "no data". `assets` is a distinct blue-
 * grey treatment reserved for the counter tiles (Installed /
 * Recommended assets); those are neither good nor bad, just facts, so
 * they read as informational instead of borrowing the healthy-green
 * palette which would falsely imply status.
 */
type CardTone = 'active-danger' | 'active-warning' | 'active-healthy' | 'assets' | 'assets-empty';

interface TonePalette {
  readonly line: string;
  readonly fill: string;
  readonly background: string;
  readonly numberColor: string;
  readonly borderColor?: string;
}

const getTonePalette = (tone: CardTone, euiTheme: EuiThemeComputed): TonePalette => {
  switch (tone) {
    case 'active-danger':
      return {
        line: euiTheme.colors.severity.danger,
        fill: euiTheme.colors.severity.danger,
        background: euiTheme.colors.backgroundBaseDanger,
        numberColor: euiTheme.colors.textDanger,
        borderColor: euiTheme.colors.borderBaseDanger,
      };
    case 'active-warning':
      return {
        line: euiTheme.colors.severity.warning,
        fill: euiTheme.colors.severity.warning,
        background: euiTheme.colors.backgroundBaseWarning,
        numberColor: euiTheme.colors.textWarning,
        borderColor: euiTheme.colors.borderBaseWarning,
      };
    case 'active-healthy':
      return {
        line: euiTheme.colors.severity.success,
        fill: euiTheme.colors.severity.success,
        background: euiTheme.colors.backgroundBaseSuccess,
        numberColor: euiTheme.colors.textSuccess,
        borderColor: euiTheme.colors.borderBaseSuccess,
      };
    case 'assets':
      // Populated assets tile — blue. Uses the primary palette so it
      // reads as informational / neutral without competing with the
      // health tones (which own red / amber / green).
      return {
        line: euiTheme.colors.textPrimary,
        fill: euiTheme.colors.textPrimary,
        background: euiTheme.colors.backgroundBasePrimary,
        numberColor: euiTheme.colors.textPrimary,
        borderColor: euiTheme.colors.borderBasePrimary,
      };
    default:
      // Empty assets tile — grey. Distinct from populated assets so a
      // "0 recommended" tile visibly signals "nothing here" rather
      // than "5 items you could install", and distinct from healthy
      // green so it doesn't imply active status.
      return {
        line: euiTheme.colors.textSubdued,
        fill: euiTheme.colors.textSubdued,
        background: euiTheme.colors.backgroundBaseSubdued,
        numberColor: euiTheme.colors.textSubdued,
      };
  }
};

/**
 * Deterministic string hash (arithmetic-only — bitwise ops are banned
 * by lint). Same input always maps to the same seed so tile sparklines
 * don't jitter between renders. Not cryptographically anything — that's
 * the point.
 */
const HASH_MODULUS = 2147483647; // 2^31 - 1 (Mersenne prime)
const hashSeed = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) % HASH_MODULUS;
  }
  return hash;
};

/**
 * Tiny seeded LCG (linear congruential generator). Multiplier / adder
 * from Numerical Recipes; returns a `() => number` in `[0, 1)`. Enough
 * for background sparklines — not for anything security-adjacent.
 */
const seededRandom = (seed: number) => {
  let state = seed || 1;
  return () => {
    state = (state * 1103515245 + 12345) % HASH_MODULUS;
    return state / HASH_MODULUS;
  };
};

/**
 * Build a 24-point mock series that lands on the current `count`. Uses
 * a per-tile deterministic seed so repeated renders (and mode toggles)
 * don't jitter the trend, while different tiles / categories look
 * visually distinct. Series never goes below 0 — negative counts don't
 * exist for any of the summary metrics.
 */
const buildSparkline = (categoryId: string, tileKey: string, count: number): number[] => {
  const points = 24;
  const rand = seededRandom(hashSeed(`${categoryId}:${tileKey}`));
  if (count === 0) {
    // Perfectly flat line at zero. Adding jitter here previously made
    // the tiny noise range fill the whole card (min-max normalisation
    // amplifies any variation), which read as a chaotic sparkline on
    // an otherwise healthy tile. A dead-flat line at the bottom is the
    // correct "nothing happening" signal.
    return Array.from({ length: points }, () => 0);
  }
  // Random walk that starts around count * 0.4 and drifts to `count`.
  const values: number[] = [];
  const start = Math.max(0, count * (0.3 + rand() * 0.4));
  let current = start;
  for (let i = 0; i < points - 1; i++) {
    const delta = (rand() - 0.4) * (count * 0.25 + 1);
    current = Math.max(0, current + delta);
    values.push(current);
  }
  values.push(count);
  return values;
};

/**
 * Background sparkline for the metric card. Sits behind the number and
 * label via absolute positioning; the filled area is kept low-opacity
 * so the number stays the primary read.
 */
const BackgroundSparkline = ({
  values,
  palette,
}: {
  values: readonly number[];
  palette: TonePalette;
}) => {
  const width = 400;
  const height = 100;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = index * stepX;
      // Bias the trend to the bottom two-thirds of the card so the
      // number (top-left) stays readable regardless of the shape.
      const y = height - ((value - min) / span) * (height * 0.6) - height * 0.05;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      css={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <polygon
        points={`${points} ${width},${height} 0,${height}`}
        fill={palette.fill}
        opacity={0.18}
      />
      <polyline points={points} fill="none" stroke={palette.line} strokeWidth={1.5} opacity={0.9} />
    </svg>
  );
};

const SummaryTile = ({
  spec,
  data,
  onClick,
  categoryId,
}: {
  spec: TileSpec;
  data: TileData;
  onClick: () => void;
  categoryId: EntityCategoryId;
}) => {
  const { euiTheme } = useEuiTheme();
  const { count, tone } = data;
  const palette = getTonePalette(tone, euiTheme);
  // Sparklines only make sense for the three active tiles (Alerts,
  // SLOs, Degraded streams) where the trend tells a story — including
  // the healthy case, where a flat green line reads as reassuring. On
  // the assets counter tiles a background trend is meaningless (and
  // slightly misleading — implies fluctuation where there is none), so
  // it's omitted there entirely.
  const showSparkline = tone !== 'assets' && tone !== 'assets-empty';
  const sparkline = useMemo(
    () => (showSparkline ? buildSparkline(categoryId, spec.key, count) : []),
    [showSparkline, categoryId, spec.key, count]
  );

  const tooltip = i18n.translate(
    'xpack.streams.entityCentricLab.allEntitiesOverview.tiles.tooltip',
    {
      defaultMessage: 'View {label} for this category',
      values: { label: spec.label.toLowerCase() },
    }
  );

  return (
    <EuiToolTip content={tooltip} display="block">
      <button
        type="button"
        onClick={onClick}
        data-test-subj={`entityCentricLabAllEntitiesOverviewSummaryTile-${categoryId}-${spec.key}`}
        css={{
          all: 'unset',
          cursor: 'pointer',
          display: 'block',
          width: '100%',
          borderRadius: euiTheme.border.radius.medium,
          // Slight lift on hover to signal interactivity without the
          // heavier EUI focus ring (we still get a native focus ring via
          // the button element for keyboard users).
          transition: `transform ${euiTheme.animation.fast} ease, box-shadow ${euiTheme.animation.fast} ease`,
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: `0 2px 6px ${euiTheme.colors.borderBasePlain}`,
          },
          '&:focus-visible': {
            outline: `2px solid ${euiTheme.colors.primary}`,
            outlineOffset: 2,
          },
        }}
      >
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="m"
          css={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 120,
            backgroundColor: palette.background,
            borderColor: palette.borderColor,
          }}
        >
          {showSparkline ? <BackgroundSparkline values={sparkline} palette={palette} /> : null}
          <div css={{ position: 'relative', zIndex: 1 }}>
            <EuiText size="xs" color="subdued">
              {spec.label}
            </EuiText>
            <EuiSpacer size="s" />
            <div
              css={{
                fontSize: euiTheme.size.xl,
                lineHeight: 1,
                fontWeight: 700,
                color: palette.numberColor,
              }}
            >
              {count.toLocaleString()}
            </div>
          </div>
        </EuiPanel>
      </button>
    </EuiToolTip>
  );
};
