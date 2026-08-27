/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiColorPalettePicker,
  EuiColorPicker,
  EuiColorPickerSwatch,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiRange,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiColorPalettePickerPaletteProps,
  type EuiThemeComputed,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import {
  getEffectiveEntityHealth,
  useChaosModeEnabled,
  useEntityDisplayName,
} from '@kbn/entity-centric-lab-flyout';
import type { Entity, EntityCategoryId } from './fake_entities';
import { ENTITY_CATEGORIES, getCategoryDescriptor } from './fake_entities';
import { CLOUD_PROVIDERS, type CloudProviderDescriptor } from './cloud_providers';
import {
  STAT_OPTIONS,
  bucketKeyFor,
  effectiveStatForMetric,
  findMetric,
  getBucketMetrics,
  getMetricLegend,
  getStatLabel,
  resolveMetricReading,
  resolveMetricSparkline,
  setMetricRefreshSalt,
  toneColor,
  type BucketKey,
  type MetricDescriptor,
  type MetricReading,
  type MetricTone,
  type StatId,
} from './bucket_metrics';
import { useBucketMetricSelection, type BucketSelection } from './use_bucket_metric_selection';
import {
  MAX_RULES,
  MAX_STEPS,
  MIN_RULES,
  MIN_STEPS,
  PALETTE_OPTIONS,
  getPaletteColors,
  resolveColoringRange,
  resolvePaletteColor,
  resolveStepColor,
  type ColorMode,
  type ColoringConfig,
  type PaletteId,
  type PaletteType,
  type StepRule,
} from './palette_coloring';
import {
  KUBERNETES_CLUSTER_FILTER_ALL,
  KUBERNETES_SUB_TYPE_ORDER,
  KubernetesClusterFilter,
  filterEntitiesByCluster,
  getKubernetesClusterNames,
} from './kubernetes_cluster_filter';

interface Props {
  readonly entities: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
  /**
   * Name of the entity whose flyout is currently open, if any. The matching
   * hexagon renders a persistent selected state so the user can tell which
   * cell the flyout describes (especially when the flyout doesn't overlap it).
   */
  readonly selectedEntityName?: string | null;
  /**
   * When true, Cloud entities are grouped by provider (AWS / GCP /
   * Azure) then by service, matching the nested left-nav. When false,
   * Cloud falls back to the flat "group by type" card. Driven by the
   * discreet toolbar toggle (`useCloudHierarchyEnabled`).
   */
  readonly groupCloudByProvider?: boolean;
  /**
   * When true (ElasticOn), each bucket's pencil flyout exposes the
   * value-ramp coloring options (Gradient / Steps palette, number of
   * colors, reverse, auto range, min / max) modelled on the classic
   * Infrastructure inventory legend, and stored palette configs are
   * honoured when rendering tiles. Everywhere else tiles stay on the
   * severity tones regardless of any persisted config.
   */
  readonly enablePaletteColoring?: boolean;
  /**
   * Bumped by the ElasticOn Inventory auto-refresh (and manual refresh) so
   * tiles re-roll their synthesized readings — see `setMetricRefreshSalt`.
   * Purely a cache-buster for the per-row memoization; the actual new
   * values come from the salted hash.
   */
  readonly refreshTick?: number;
}

/**
 * Canonical name of the currently-selected entity, shared down the deeply
 * nested card/row tree so {@link MetricTile} can flag its own selected state
 * without every intermediate component having to forward the prop.
 */
const SelectedEntityContext = createContext<string | null>(null);

/**
 * Whether value-ramp palette coloring is available (ElasticOn). Threaded
 * via context so the many intermediate card components don't each have to
 * forward the flag down to `SubTypeRow` / `CategoryCardInner`.
 */
const PaletteColoringEnabledContext = createContext<boolean>(false);

/**
 * Auto-refresh cache-buster (see {@link setMetricRefreshSalt}). Threaded so
 * `BucketTileRow` can list it as a memo dependency and recompute readings
 * when the ElasticOn Inventory refreshes.
 */
const RefreshTickContext = createContext<number>(0);

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/** Parse an `rgb()`/`rgba()`/hex color into RGBA components (a in [0,1]). */
const parseColor = (color: string): { r: number; g: number; b: number; a: number } | null => {
  const value = color.trim();
  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((part) => parseFloat(part.trim()));
    if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    if (hex.length === 6) hex += 'ff';
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: parseInt(hex.slice(6, 8), 16) / 255,
    };
  }
  return null;
};

const toHexByte = (value: number): string =>
  Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0');

/**
 * Flatten a (possibly semi-transparent) foreground colour over an opaque
 * background into a solid hex. The severity tiles paint a translucent
 * `toneColor` over the light page, so flattening the same tone over the
 * page background yields the exact solid colour the eye sees — which,
 * unlike the raw `rgba(...)`, renders correctly in `EuiColorPicker`.
 */
const flattenColor = (foreground: string, background: string): string => {
  const fg = parseColor(foreground);
  if (!fg) return foreground;
  const bg = parseColor(background) ?? { r: 255, g: 255, b: 255, a: 1 };
  const r = fg.r * fg.a + bg.r * (1 - fg.a);
  const g = fg.g * fg.a + bg.g * (1 - fg.a);
  const b = fg.b * fg.a + bg.b * (1 - fg.a);
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
};

/** Opaque hex equivalent of a severity tile tone (tone over the page). */
const solidToneColor = (tone: MetricTone, euiTheme: EuiThemeComputed): string =>
  flattenColor(toneColor(tone, euiTheme), euiTheme.colors.emptyShade);

/**
 * Default Steps rules for a numeric metric: one threshold per severity
 * band (Good / Warning / Critical) at the metric's own warn/crit values,
 * coloured with the *exact* solid tones the tiles use in Automatic mode.
 * Derived from the live metric so the "out of the box" Steps setup always
 * mirrors Automatic coloring (colours + thresholds) — the seed is never
 * persisted, so it can't drift from Automatic as the theme/metric change.
 */
const buildDefaultStepRules = (
  metric: MetricDescriptor,
  euiTheme: EuiThemeComputed
): StepRule[] => {
  if (metric.kind !== 'numeric') return [];
  // Use the exact same (semi-transparent) tones the tiles paint in
  // Automatic mode so a fresh Steps setup is pixel-identical to Automatic.
  // The little color-picker swatch flattens these for display only.
  const goodColor = toneColor('good', euiTheme);
  const warningColor = toneColor('warning', euiTheme);
  const dangerColor = toneColor('danger', euiTheme);
  const { warn, crit, direction } = metric.thresholds;
  const minValue = Math.round(metric.range.min);
  if (direction === 'asc') {
    return [
      { color: goodColor, label: 'Good', value: minValue },
      { color: warningColor, label: 'Warning', value: warn },
      { color: dangerColor, label: 'Critical', value: crit },
    ];
  }
  return [
    { color: dangerColor, label: 'Critical', value: minValue },
    { color: warningColor, label: 'Warning', value: crit },
    { color: goodColor, label: 'Good', value: warn },
  ];
};

/**
 * The rules a Steps config should render with: the user's persisted rules
 * once they've edited them, otherwise the freshly-derived defaults. Keeping
 * unedited buckets on the derived defaults means stale rules from earlier
 * builds can never override the Automatic-matching seed.
 */
const effectiveStepRules = (
  coloring: ColoringConfig,
  metric: MetricDescriptor,
  euiTheme: EuiThemeComputed
): readonly StepRule[] =>
  coloring.rules && coloring.rules.length > 0
    ? coloring.rules
    : buildDefaultStepRules(metric, euiTheme);

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

/**
 * Tone sort order — danger first, then warning, "in progress" /
 * unknown / idle states, finally good. Matches the metric legend's
 * left-to-right reading order ("worst → best") so the eye lands on
 * trouble spots first without having to scan the whole row.
 */
const TONE_RANK: Record<MetricTone, number> = {
  danger: 0,
  warning: 1,
  accent: 2,
  neutral: 3,
  subdued: 4,
  // `info` (blue, e.g. Succeeded Pods) ranks just before `good`:
  // completed end-states aren't actively healthy, but they're not a
  // problem either — visually grouped with the "fine" cluster on the
  // right of the row.
  info: 5,
  good: 6,
};

/**
 * Hover-card state for the tile grid. Position is in wrapper-local
 * pixels; `placeLeft` / `placeAbove` flip the card away from the
 * nearest edge so it never spills outside the bucket row.
 */
interface TileHover {
  readonly entity: Entity;
  readonly reading: MetricReading;
  readonly x: number;
  readonly y: number;
  readonly placeLeft: boolean;
  readonly placeAbove: boolean;
}

type TileHoverHandler = (
  entity: Entity,
  reading: MetricReading,
  event: React.MouseEvent<HTMLButtonElement>
) => void;

type TileFocusHandler = (
  entity: Entity,
  reading: MetricReading,
  event: React.FocusEvent<HTMLButtonElement>
) => void;

// ---------------------------------------------------------------------------
// Honeycomb geometry
// ---------------------------------------------------------------------------
//
// Pointy-top hexagons in a proper tessellating grid.
//
// The bounding box holds the *grid slot*; the visible hexagon is
// slightly smaller than the slot so a hair-line gap appears between
// every cell (the classic honeycomb look — see the "proper honeycomb"
// reference the user shared). All spacing is derived from `HEX_W` so
// the ratios stay exact:
//
//   - `HEX_H = W × 2/√3` is the natural pointy-top aspect ratio; used
//     verbatim (fractional) so adjacent rows interlock pixel-perfectly.
//   - `ROW_STEP_Y = 3/4 × H` places every next row so its hexagons drop
//     into the notches of the row above (canonical honeycomb offset).
//   - `ROW_OFFSET_X = W/2` shifts odd-indexed rows horizontally so the
//     tessellation lines up column-wise.
//   - `HEX_GAP_SCALE = 0.92` shrinks the visible hexagon inside its
//     slot; the surrounding transparent margin is what produces the
//     visible cell borders. Slot dimensions stay unchanged so
//     tessellation math is unaffected.
const HEX_W = 24;
const HEX_H = (HEX_W * 2) / Math.sqrt(3); // fractional, do NOT round
const ROW_STEP_Y = HEX_H * 0.75;
const ROW_OFFSET_X = HEX_W / 2;
const ROW_VERTICAL_OVERLAP = HEX_H - ROW_STEP_Y;
const HEX_GAP_SCALE = 0.92;
const HEX_CLIP_PATH = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

interface MetricTileProps {
  readonly entity: Entity;
  readonly metric: MetricDescriptor;
  readonly statId: StatId;
  readonly reading: MetricReading;
  readonly euiTheme: EuiThemeComputed;
  /**
   * Concrete fill colour when palette coloring is active; falls back to
   * the reading's severity tone when omitted.
   */
  readonly fillColor?: string;
  readonly onSelectEntity: (entityName: string) => void;
  readonly onHover: TileHoverHandler;
  readonly onFocusHover: TileFocusHandler;
  readonly onHoverEnd: () => void;
}

const MetricTile = ({
  entity,
  metric,
  statId,
  reading,
  euiTheme,
  fillColor,
  onSelectEntity,
  onHover,
  onFocusHover,
  onHoverEnd,
}: MetricTileProps) => {
  // Resolve through the shared store so a wizard `displayField` change
  // re-labels the hover card immediately. Stable hash-derived values keep
  // every tile uniquely addressable even when the user picks something
  // like `kubernetes.pod.uid` for the entire kind.
  const displayName = useEntityDisplayName(entity.name, entity.type);
  const isSelected = useContext(SelectedEntityContext) === entity.name;
  // Palette mode supplies an opaque concrete colour; severity mode uses
  // the semi-transparent tone (composited over the light page).
  const fill = fillColor ?? toneColor(reading.tone, euiTheme);
  const tileClass = useMemo(
    () => css`
      width: ${HEX_W}px;
      height: ${HEX_H}px;
      /*
        Pointy-top hexagon. \`clip-path\` is the simplest way to get a
        proper hexagonal shape while keeping the element a plain
        \`<button>\` — the click/hover/focus targets stay the tile's
        bounding box (a hair wider than the visible shape), which is
        what we want for pointer forgiveness. Scaling the clipped
        surface down by \`HEX_GAP_SCALE\` produces the hair-line gap
        between honeycomb cells without disturbing the tessellation
        grid (the slot dimensions are unchanged).
      */
      clip-path: ${HEX_CLIP_PATH};
      transform: scale(${HEX_GAP_SCALE});
      background-color: ${fill};
      flex: 0 0 ${HEX_W}px;
      padding: 0;
      border: none;
      cursor: pointer;
      /*
        Slightly pop the hovered cell on top of neighbouring transparent
        corners so the shape reads unambiguously as a single hexagon.
      */
      transition: transform 120ms ease;
      ${isSelected
        ? `
        z-index: 2;
        position: relative;
        /*
          Selected hex keeps its fill exactly as-is — same colour AND size
          as its neighbours. A \`clip-path\` clips \`border\`/\`box-shadow\`, so
          the stroke is drawn by growing a dark-grey hexagon outward to the
          full slot (overriding the ${HEX_GAP_SCALE} gap scale) and laying
          the fill back on top at the normal gap size via \`::after\`. Tones
          are semi-transparent (see \`toneColor\`), so the fill is painted
          over an opaque \`emptyShade\` backing — otherwise it would
          composite over the dark-grey ring and read as a darker colour.
          The dark grey only shows in the surrounding gap.
        */
        transform: scale(1);
        background-color: ${euiTheme.colors.darkShade};
        &::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: scale(${HEX_GAP_SCALE});
          clip-path: ${HEX_CLIP_PATH};
          background-color: ${euiTheme.colors.emptyShade};
          background-image: linear-gradient(${fill}, ${fill});
          pointer-events: none;
        }
      `
        : ''}
      &:hover,
      &:focus-visible {
        transform: scale(${Math.min(1, HEX_GAP_SCALE + 0.06)});
      }
    `,
    [fill, euiTheme, isSelected]
  );
  // Accessible summary — the visual hover card is decorative, so the
  // full reading still needs to be reachable by screen readers.
  const ariaLabel = i18n.translate('xpack.streams.entityCentricLab.entities.metricTileTooltip', {
    defaultMessage: '{entityName} — {metricLabel} ({stat}): {value}',
    values: {
      entityName: displayName,
      metricLabel: metric.label,
      stat: getStatLabel(statId),
      value: reading.displayValue,
    },
  });
  return (
    <button
      type="button"
      className={tileClass}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      // Stable test-subj uses the canonical name so existing
      // selectors keep working even when the user re-labels via the
      // wizard or swaps the bucket metric.
      data-test-subj={`entityCentricLabHealthTile-${entity.name}`}
      onClick={() => onSelectEntity(entity.name)}
      onMouseEnter={(event) => onHover(entity, reading, event)}
      onMouseMove={(event) => onHover(entity, reading, event)}
      onMouseLeave={onHoverEnd}
      onFocus={(event) => onFocusHover(entity, reading, event)}
      onBlur={onHoverEnd}
    />
  );
};

// ---------------------------------------------------------------------------
// Tile hover card
// ---------------------------------------------------------------------------

/**
 * Tiny inline sparkline for the numeric hover cards. Draws a faint filled
 * area under a solid trend line; auto-scales to the series min/max.
 */
const TileSparkline = ({ values, color }: { values: readonly number[]; color: string }) => {
  const width = 200;
  const height = 40;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height, marginTop: 8 }}
      aria-hidden
    >
      <polygon points={`${points} ${width},${height} 0,${height}`} fill={color} opacity={0.18} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
};

/**
 * Styled dark hover card for a tile — consistent with the Geomap view's
 * region card. Shows the entity name + type, the current Color-by value
 * (with a tone swatch) and, for numeric metrics, a trend sparkline.
 * Rendered once per bucket row and positioned over the hovered tile.
 */
const MetricTileTooltip = ({
  hover,
  metric,
  statId,
  euiTheme,
  fillColor,
}: {
  hover: TileHover;
  metric: MetricDescriptor;
  statId: StatId;
  euiTheme: EuiThemeComputed;
  fillColor?: string;
}) => {
  const { entity, reading, x, y, placeLeft, placeAbove } = hover;
  const displayName = useEntityDisplayName(entity.name, entity.type);
  // Categorical metrics (Status, Phase, …) get no sparkline — a trend
  // line over an enum is meaningless.
  const sparkline =
    metric.kind === 'categorical'
      ? null
      : resolveMetricSparkline(entity.name, metric, statId, entity.health);
  const OFFSET = 12;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${placeLeft ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`}, ${
          placeAbove ? `calc(-100% - ${OFFSET}px)` : `${OFFSET}px`
        })`,
        pointerEvents: 'none',
        zIndex: 3,
        width: 224,
        padding: '8px 12px',
        borderRadius: euiTheme.border.radius.medium,
        background: '#1d2a3a',
        color: '#ffffff',
        boxShadow: '0 4px 12px rgba(29, 42, 58, 0.4)',
        fontSize: 12,
        lineHeight: 1.4,
      }}
      data-test-subj="entityCentricLabHealthTileTooltip"
    >
      <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {displayName}
      </div>
      <div style={{ opacity: 0.7, marginBottom: 6 }}>{entity.type}</div>
      <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.15)', margin: '0 0 6px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            // `toneColor` is semi-transparent, so on the dark tooltip it would
            // composite to a different shade than the tiles (which sit on the
            // light page). Layer the tone (or the palette colour) over the
            // same light base the tiles use so the swatch reads identically
            // to its square.
            background: `linear-gradient(${fillColor ?? toneColor(reading.tone, euiTheme)}, ${
              fillColor ?? toneColor(reading.tone, euiTheme)
            }), ${euiTheme.colors.emptyShade}`,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, opacity: 0.85 }}>
          {i18n.translate('xpack.streams.entityCentricLab.entities.tileTooltip.metricLine', {
            defaultMessage: '{metricLabel} ({stat})',
            values: { metricLabel: metric.label, stat: getStatLabel(statId) },
          })}
        </span>
        <span style={{ fontWeight: 600 }}>{reading.displayValue}</span>
      </div>
      {sparkline ? (
        <TileSparkline
          values={sparkline}
          color={fillColor ?? solidToneColor(reading.tone, euiTheme)}
        />
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tile row + bucket controls
// ---------------------------------------------------------------------------

interface BucketTileRowProps {
  readonly entities: readonly Entity[];
  readonly metric: MetricDescriptor;
  readonly statId: StatId;
  readonly onSelectEntity: (entityName: string) => void;
  /**
   * Active palette config + resolved range when palette coloring is on.
   * Null (the common case) keeps tiles on their severity tone.
   */
  readonly coloring?: ColoringConfig | null;
  readonly paletteRange?: { readonly min: number; readonly max: number } | null;
}

const BucketTileRow = ({
  entities,
  metric,
  statId,
  onSelectEntity,
  coloring = null,
  paletteRange = null,
}: BucketTileRowProps) => {
  const { euiTheme } = useEuiTheme();
  // Auto-refresh cache-buster: listed in the `ordered` memo deps so tiles
  // recompute their (salted) readings when the Inventory refreshes.
  const refreshTick = useContext(RefreshTickContext);
  // Palette mode paints each tile from a value-ramp (Gradient) or a set
  // of threshold rules (Steps); resolve a concrete colour per reading.
  // When off, `fillFor` returns undefined so tiles fall back to tone.
  const fillFor = useCallback(
    (reading: MetricReading): string | undefined => {
      if (!coloring || coloring.mode !== 'palette' || reading.rawValue === undefined) {
        return undefined;
      }
      if (coloring.type === 'steps') {
        return resolveStepColor(
          reading.rawValue,
          effectiveStepRules(coloring, metric, euiTheme),
          euiTheme.colors.lightShade
        );
      }
      if (!paletteRange) return undefined;
      return resolvePaletteColor(reading.rawValue, paletteRange, coloring);
    },
    [coloring, paletteRange, metric, euiTheme]
  );
  // Clamp the stat to "Last" for categorical metrics (Phase, Status,
  // …) since avg/min/max of an enum has no meaning. Resolved here so
  // both the tile color and the tooltip label stay in sync with the
  // (forced) Stat dropdown value above.
  const effectiveStat = effectiveStatForMetric(metric, statId);
  // Resolve every reading once, then sort tiles worst → best.
  //
  //   - Palette mode (numeric): sort by the raw value so the gradient /
  //     stepped colours read as a smooth progression rather than being
  //     scrambled by the severity-tone order. "Worst" respects the
  //     metric direction (higher-is-worse `asc` → highest first;
  //     higher-is-better `desc` → lowest first).
  //   - Otherwise: sort by severity tone (danger first) so the eye
  //     lands on trouble.
  //
  // Ties fall back to the entity name for a stable, alphabetic secondary
  // order so tiles keep their position across re-renders and don't
  // visually shuffle when the user changes stat.
  const sortByValue = Boolean(coloring && coloring.mode === 'palette' && metric.kind === 'numeric');
  const ordered = useMemo(() => {
    // Re-seed the shared reading salt from the refresh tick so tiles re-roll
    // on Inventory (auto-)refresh. Tick 0 keeps the empty (stable) salt so
    // every other mode / first render is unchanged. All rows share the same
    // tick, so the salt stays consistent across the grid and the tooltips.
    setMetricRefreshSalt(refreshTick ? String(refreshTick) : '');
    const withReadings = entities.map((entity) => ({
      entity,
      // Health hint keeps the tile color coherent with the
      // entity-list Health column — `healthy` entities trend green,
      // `atRisk` yellow, `unhealthy` red — so toggling between views
      // doesn't change the story for a given entity.
      reading: resolveMetricReading(entity.name, metric, effectiveStat, entity.health),
    }));
    const direction = metric.kind === 'numeric' ? metric.thresholds.direction : 'asc';
    withReadings.sort((a, b) => {
      if (sortByValue) {
        const aValue = a.reading.rawValue ?? 0;
        const bValue = b.reading.rawValue ?? 0;
        // asc  → higher is worse → descending (worst first)
        // desc → lower  is worse → ascending  (worst first)
        const delta = direction === 'asc' ? bValue - aValue : aValue - bValue;
        if (delta !== 0) return delta;
        return a.entity.name.localeCompare(b.entity.name);
      }
      const rank = TONE_RANK[a.reading.tone] - TONE_RANK[b.reading.tone];
      if (rank !== 0) return rank;
      return a.entity.name.localeCompare(b.entity.name);
    });
    return withReadings;
  }, [entities, metric, effectiveStat, sortByValue, refreshTick]);
  // No truncation — every entity in the bucket renders as its own tile
  // so the grid view stays consistent with the count shown in the
  // header (and with the list-view count). Instead of a flat
  // flex-wrap grid we now chunk `ordered` into fixed-width honeycomb
  // rows (see `HEX_*` constants above); odd rows are shifted right
  // and rows overlap vertically so hexagons tessellate.
  // `position: relative` anchors the absolutely-positioned hover card.
  const containerClass = css`
    position: relative;
    display: block;
  `;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<TileHover | null>(null);

  // How many hexagons fit in one row at the current container width.
  // Measured with a ResizeObserver so the layout stays responsive when
  // the flyout / side nav open, the window resizes, or the surrounding
  // grid columns re-flow. Subtract `ROW_OFFSET_X` from the usable width
  // so odd rows (which shift right by half a hex) don't overflow.
  const [tilesPerRow, setTilesPerRow] = useState(0);
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return undefined;
    const compute = () => {
      const usable = Math.max(0, el.clientWidth - ROW_OFFSET_X);
      setTilesPerRow(Math.max(1, Math.floor(usable / HEX_W)));
    };
    compute();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Chunk the ordered tiles into rows once the width is known. When
  // `tilesPerRow` is 0 (very first render, pre-measure), render nothing
  // — the useLayoutEffect will fire synchronously and re-render with a
  // real value, so users never see the empty state.
  const rows = useMemo(() => {
    if (tilesPerRow <= 0) return [];
    const chunks: Array<typeof ordered> = [];
    for (let index = 0; index < ordered.length; index += tilesPerRow) {
      chunks.push(ordered.slice(index, index + tilesPerRow));
    }
    return chunks;
  }, [ordered, tilesPerRow]);

  // Enough vertical room above the pointer for the card (~1 title + type
  // + metric line + sparkline); flip below when hovering near the top.
  const CARD_FLIP_ABOVE_PX = 170;
  const CARD_FLIP_LEFT_PX = 240;

  const showFromEvent: TileHoverHandler = (entity, reading, event) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    setHover({
      entity,
      reading,
      x: localX,
      y: localY,
      placeLeft: localX > rect.width - CARD_FLIP_LEFT_PX,
      placeAbove: localY > CARD_FLIP_ABOVE_PX,
    });
  };

  // Keyboard focus has no pointer — anchor the card on the focused tile.
  const showFromFocus: TileFocusHandler = (entity, reading, event) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tileRect = event.currentTarget.getBoundingClientRect();
    const localX = tileRect.left - rect.left + tileRect.width / 2;
    const localY = tileRect.top - rect.top;
    setHover({
      entity,
      reading,
      x: localX,
      y: localY,
      placeLeft: localX > rect.width - CARD_FLIP_LEFT_PX,
      placeAbove: localY > CARD_FLIP_ABOVE_PX,
    });
  };

  const hideHover = () => setHover(null);

  return (
    <div ref={wrapperRef} className={containerClass} role="list">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'flex',
            // Odd rows shift right by half a hexagon so hexagons in
            // adjacent rows line up column-wise (canonical honeycomb).
            marginLeft: rowIndex % 2 === 1 ? ROW_OFFSET_X : 0,
            // Every row after the first rides up by the overlap amount
            // so its hexagons drop into the notches of the row above.
            marginTop: rowIndex === 0 ? 0 : -ROW_VERTICAL_OVERLAP,
          }}
        >
          {row.map(({ entity, reading }) => (
            <MetricTile
              key={entity.id}
              entity={entity}
              metric={metric}
              statId={effectiveStat}
              reading={reading}
              euiTheme={euiTheme}
              fillColor={fillFor(reading)}
              onSelectEntity={onSelectEntity}
              onHover={showFromEvent}
              onFocusHover={showFromFocus}
              onHoverEnd={hideHover}
            />
          ))}
        </div>
      ))}
      {hover ? (
        <MetricTileTooltip
          hover={hover}
          metric={metric}
          statId={effectiveStat}
          euiTheme={euiTheme}
          fillColor={fillFor(hover.reading)}
        />
      ) : null}
    </div>
  );
};

/** Format a range bound for the palette legend, honouring unit/precision. */
const formatRangeValue = (metric: MetricDescriptor, value: number): string => {
  const precision = metric.kind === 'numeric' ? metric.precision ?? 0 : 0;
  const rounded = precision > 0 ? value.toFixed(precision) : `${Math.round(value)}`;
  const unit = metric.kind === 'numeric' ? metric.unit : undefined;
  return unit ? `${rounded}${unit}` : rounded;
};

/** Metric-name prefix shared by the palette / steps legends. */
const LegendMetricPrefix = ({ metric }: { metric: MetricDescriptor }) => (
  <EuiFlexItem grow={false}>
    <EuiText size="xs" color="subdued">
      <strong>
        {i18n.translate('xpack.streams.entityCentricLab.entities.bucket.legend.metricPrefix', {
          defaultMessage: '{metricLabel}:',
          values: { metricLabel: metric.label },
        })}
      </strong>
    </EuiText>
  </EuiFlexItem>
);

/**
 * Continuous gradient ramp + min / max labels for Gradient palette mode.
 */
const PaletteGradientLegend = ({
  metric,
  coloring,
  range,
}: {
  metric: MetricDescriptor;
  coloring: ColoringConfig;
  range: { readonly min: number; readonly max: number };
}) => {
  const colors = useMemo(
    () => getPaletteColors(coloring.paletteId, coloring.steps, coloring.reverse),
    [coloring.paletteId, coloring.steps, coloring.reverse]
  );
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj="entityCentricLabBucketPaletteLegend"
    >
      <LegendMetricPrefix metric={metric} />
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {formatRangeValue(metric, range.min)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 120, maxWidth: 260, flexBasis: 200 }}>
        <div
          style={{
            height: 10,
            width: '100%',
            borderRadius: 2,
            backgroundImage: `linear-gradient(to right, ${colors.join(', ')})`,
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {formatRangeValue(metric, range.max)}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Swatch + label per threshold rule for Steps palette mode. Reads like
 * the categorical legend so users decode the custom bands at a glance;
 * rules are sorted ascending by threshold value.
 */
const StepRulesLegend = ({
  metric,
  rules,
}: {
  metric: MetricDescriptor;
  rules: readonly StepRule[];
}) => {
  const sorted = useMemo(() => [...rules].sort((a, b) => a.value - b.value), [rules]);
  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      responsive={false}
      wrap
      data-test-subj="entityCentricLabBucketStepsLegend"
    >
      <LegendMetricPrefix metric={metric} />
      {sorted.map((rule, index) => (
        <EuiFlexItem grow={false} key={`${rule.label}-${rule.value}-${index}`}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: rule.color,
                  display: 'inline-block',
                  flex: '0 0 10px',
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {rule.label || formatRangeValue(metric, rule.value)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

interface BucketMetricLegendProps {
  readonly metric: MetricDescriptor;
  /** Palette config + range when palette coloring is active; else null. */
  readonly coloring?: ColoringConfig | null;
  readonly paletteRange?: { readonly min: number; readonly max: number } | null;
}

/**
 * Compact horizontal legend rendered above each bucket's tile row.
 * One swatch + label per value (categorical metrics) or per severity
 * band (numeric metrics). Wraps gracefully on narrow screens; uses the
 * same tone palette as the tiles themselves so users can decode the
 * grid at a glance without hovering. When a numeric bucket colours by
 * value palette, a gradient / steps ramp replaces the swatches.
 */
const BucketMetricLegend = ({
  metric,
  coloring = null,
  paletteRange = null,
}: BucketMetricLegendProps) => {
  const { euiTheme } = useEuiTheme();
  const entries = useMemo(() => getMetricLegend(metric), [metric]);
  const swatchClass = useMemo(
    () => css`
      width: 10px;
      height: 10px;
      /*
        Filled circles instead of rounded squares — they read as a
        distinct language from the honeycomb hexagons below, so users
        don't try to match swatch shape ↔ tile shape.
      */
      border-radius: 50%;
      flex: 0 0 10px;
    `,
    []
  );
  // Palette mode swaps the discrete swatches for a gradient ramp or a
  // set of threshold-rule swatches. Placed after all hooks so hook order
  // stays stable across renders.
  if (coloring && coloring.mode === 'palette') {
    if (coloring.type === 'steps') {
      return (
        <StepRulesLegend metric={metric} rules={effectiveStepRules(coloring, metric, euiTheme)} />
      );
    }
    if (coloring.type === 'gradient' && paletteRange) {
      return <PaletteGradientLegend metric={metric} coloring={coloring} range={paletteRange} />;
    }
  }
  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      responsive={false}
      wrap
      data-test-subj="entityCentricLabBucketLegend"
    >
      {/* Lead with the metric name so the swatches read as
          "Status: Running / Degraded / …" — otherwise the colours are
          ambiguous (is yellow "Degraded" or "60–85%"?). */}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <strong>
            {i18n.translate('xpack.streams.entityCentricLab.entities.bucket.legend.metricPrefix', {
              defaultMessage: '{metricLabel}:',
              values: { metricLabel: metric.label },
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>
      {entries.map((entry) => (
        <EuiFlexItem grow={false} key={`${entry.label}-${entry.tone}`}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                aria-hidden
                className={swatchClass}
                style={{ backgroundColor: toneColor(entry.tone, euiTheme) }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {entry.label}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

/**
 * Threshold-rule editor for Steps mode — one row per rule (colour
 * swatch + label + threshold value), plus add / delete. Mirrors the
 * classic Infrastructure inventory "Steps" legend table.
 */
const StepRulesEditor = ({
  bucketKey,
  rules,
  newStepColor,
  onChange,
}: {
  bucketKey: BucketKey;
  rules: readonly StepRule[];
  newStepColor: string;
  onChange: (rules: StepRule[]) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  // Preset swatches = the tile tones (flattened to solid hex) so the
  // picker offers the same palette the grid uses by default.
  const toneSwatches = useMemo(
    () => [
      solidToneColor('good', euiTheme),
      solidToneColor('warning', euiTheme),
      solidToneColor('danger', euiTheme),
      solidToneColor('accent', euiTheme),
      solidToneColor('info', euiTheme),
      solidToneColor('neutral', euiTheme),
    ],
    [euiTheme]
  );
  const updateRule = (index: number, patch: Partial<StepRule>) =>
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  const deleteRule = (index: number) => onChange(rules.filter((_, i) => i !== index));
  const addRule = () => onChange([...rules, { color: newStepColor, label: '', value: 0 }]);

  return (
    <div data-test-subj={`entityCentricLabBucketStepsEditor-${bucketKey}`}>
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <EuiFlexItem grow={false} style={{ width: 44 }}>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.entityCentricLab.entities.bucket.controls.stepColor', {
                defaultMessage: 'Color',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.entityCentricLab.entities.bucket.controls.stepLabel', {
                defaultMessage: 'Label',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 90 }}>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.entityCentricLab.entities.bucket.controls.stepValue', {
                defaultMessage: 'Value',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 28 }} />
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {rules.map((rule, index) => (
        <React.Fragment key={index}>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiFlexItem grow={false} style={{ width: 44 }}>
              <EuiColorPicker
                onChange={(color) => updateRule(index, { color })}
                color={rule.color}
                compressed
                showAlpha
                swatches={toneSwatches}
                button={
                  <EuiColorPickerSwatch
                    // The stored colour may be a semi-transparent tone
                    // (so tiles match Automatic exactly); flatten it over
                    // the panel so the swatch shows the true colour instead
                    // of a washed-out / white square.
                    color={flattenColor(rule.color, euiTheme.colors.emptyShade)}
                    aria-label={i18n.translate(
                      'xpack.streams.entityCentricLab.entities.bucket.controls.stepColorAriaLabel',
                      { defaultMessage: 'Select color' }
                    )}
                  />
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldText
                compressed
                value={rule.label}
                placeholder={i18n.translate(
                  'xpack.streams.entityCentricLab.entities.bucket.controls.stepLabelPlaceholder',
                  { defaultMessage: 'Label' }
                )}
                onChange={(event) => updateRule(index, { label: event.target.value })}
                aria-label={i18n.translate(
                  'xpack.streams.entityCentricLab.entities.bucket.controls.stepLabelAriaLabel',
                  { defaultMessage: 'Step label' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ width: 90 }}>
              <EuiFieldNumber
                compressed
                value={rule.value}
                onChange={(event) => {
                  const parsed = parseFloat(event.target.value);
                  updateRule(index, { value: isNaN(parsed) ? 0 : parsed });
                }}
                aria-label={i18n.translate(
                  'xpack.streams.entityCentricLab.entities.bucket.controls.stepValueAriaLabel',
                  { defaultMessage: 'Step value' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ width: 28 }}>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                size="xs"
                disabled={rules.length <= MIN_RULES}
                onClick={() => deleteRule(index)}
                aria-label={i18n.translate(
                  'xpack.streams.entityCentricLab.entities.bucket.controls.stepDelete',
                  { defaultMessage: 'Delete step' }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </React.Fragment>
      ))}
      <EuiButton
        size="s"
        color="text"
        iconType="plus"
        onClick={addRule}
        disabled={rules.length >= MAX_RULES}
        data-test-subj={`entityCentricLabBucketStepsAdd-${bucketKey}`}
      >
        {i18n.translate('xpack.streams.entityCentricLab.entities.bucket.controls.stepAdd', {
          defaultMessage: 'Add step',
        })}
      </EuiButton>
    </div>
  );
};

interface BucketMetricControlsProps {
  readonly bucketKey: BucketKey;
  readonly label: string;
  readonly metric: MetricDescriptor;
  readonly statId: StatId;
  readonly coloring: ColoringConfig;
  readonly enablePaletteColoring: boolean;
  readonly onApply: (next: BucketSelection) => void;
}

/**
 * Compact edit affordance rendered next to a bucket header. Rather
 * than exposing the "Color by" / "Stat" dropdowns inline (two controls
 * per bucket, several buckets per card — visually noisy), we surface a
 * single pencil icon that opens a flyout holding the same options. The
 * grid stays clean; the controls are one click away.
 */
const BucketMetricControls = ({
  bucketKey,
  label,
  metric,
  statId,
  coloring,
  enablePaletteColoring,
  onApply,
}: BucketMetricControlsProps) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const editLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.bucket.controls.editDisplay',
    { defaultMessage: 'Edit display' }
  );
  return (
    <>
      <EuiToolTip content={editLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="pencil"
          color="text"
          display="base"
          size="s"
          aria-label={editLabel}
          onClick={() => setIsFlyoutOpen(true)}
          data-test-subj={`entityCentricLabBucketEdit-${bucketKey}`}
        />
      </EuiToolTip>
      {isFlyoutOpen ? (
        <BucketMetricControlsFlyout
          bucketKey={bucketKey}
          label={label}
          metric={metric}
          statId={statId}
          coloring={coloring}
          enablePaletteColoring={enablePaletteColoring}
          onApply={onApply}
          onClose={() => setIsFlyoutOpen(false)}
        />
      ) : null}
    </>
  );
};

interface BucketMetricControlsFlyoutProps extends BucketMetricControlsProps {
  readonly onClose: () => void;
}

/**
 * Flyout body for a single bucket's display options. Holds the
 * "Color by" (metric) and "Stat" (aggregation) selectors as full-width
 * form rows. Edits are staged in local draft state and only committed
 * to the grid when the user hits "Apply" — "Cancel" discards them.
 */
const BucketMetricControlsFlyout = ({
  bucketKey,
  label,
  metric,
  statId,
  coloring,
  enablePaletteColoring,
  onApply,
  onClose,
}: BucketMetricControlsFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'entityCentricLabBucketControlsFlyout' });
  const colorModeGroupId = useGeneratedHtmlId({ prefix: 'entityCentricLabBucketColorMode' });
  const paletteTypeGroupId = useGeneratedHtmlId({ prefix: 'entityCentricLabBucketPaletteType' });
  const metrics = getBucketMetrics(bucketKey);
  const metricOptions = useMemo(
    () => metrics.map((descriptor) => ({ value: descriptor.id, text: descriptor.label })),
    [metrics]
  );
  const statOptions = useMemo(
    () => STAT_OPTIONS.map((option) => ({ value: option.id, text: option.label })),
    []
  );
  // Draft state — the grid keeps rendering the committed selection until
  // the user hits Apply, so opening the flyout and cancelling is a no-op.
  const [draftMetricId, setDraftMetricId] = useState<string>(metric.id);
  const [draftStatId, setDraftStatId] = useState<StatId>(statId);
  const [draftColoring, setDraftColoring] = useState<ColoringConfig>(coloring);

  const draftMetric = findMetric(bucketKey, draftMetricId) ?? metrics[0];
  const isCategorical = draftMetric.kind === 'categorical';
  // The value-ramp options only make sense for numeric metrics and only
  // when ElasticOn is on; categorical metrics always colour by their
  // fixed semantic values.
  const showColoringSection = enablePaletteColoring && !isCategorical;
  const showPaletteOptions = showColoringSection && draftColoring.mode === 'palette';

  const isDirty =
    draftMetricId !== metric.id ||
    draftStatId !== statId ||
    JSON.stringify(draftColoring) !== JSON.stringify(coloring);

  // Palette previews for the color picker reflect the reverse toggle so
  // the swatch matches the grid (gradient mode only shows the picker).
  const palettePickerPalettes = useMemo<EuiColorPalettePickerPaletteProps[]>(
    () =>
      PALETTE_OPTIONS.map((option) => ({
        value: option.id,
        title: option.label,
        palette: getPaletteColors(option.id, 8, draftColoring.reverse),
        type: 'gradient',
      })),
    [draftColoring.reverse]
  );

  // Default Steps rules seeded from the metric's own warn/crit thresholds
  // AND the exact tile tones the severity view uses (`toneColor`) — so
  // switching to Steps opens identical to today's default colouring, then
  // the user tweaks colours / labels / thresholds. `desc` metrics (higher
  // is better) map the danger band to the low end.
  const defaultStepRules = useMemo<StepRule[]>(
    () => buildDefaultStepRules(draftMetric, euiTheme),
    [draftMetric, euiTheme]
  );

  const updateColoring = (patch: Partial<ColoringConfig>) =>
    setDraftColoring((current) => ({ ...current, ...patch }));

  // Switching type never persists the seeded rules: unedited Steps
  // buckets derive their rules from the metric at render time (see
  // `effectiveStepRules`) so they always mirror Automatic and can't be
  // overridden by stale rules from an earlier build. Rules are only
  // persisted once the user actually edits a colour / label / threshold.
  const handleTypeChange = (nextType: PaletteType) => {
    updateColoring({ type: nextType });
  };

  const handleApply = () => {
    onApply({ metricId: draftMetricId, statId: draftStatId, coloring: draftColoring });
    onClose();
  };
  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="s"
      aria-labelledby={titleId}
      data-test-subj={`entityCentricLabBucketControlsFlyout-${bucketKey}`}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {i18n.translate('xpack.streams.entityCentricLab.entities.bucket.controls.flyoutTitle', {
              defaultMessage: 'Display options — {label}',
              values: { label },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="div">
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.entityCentricLab.entities.bucket.controls.colorBy',
              { defaultMessage: 'Color by' }
            )}
            fullWidth
          >
            <EuiSelect
              fullWidth
              options={metricOptions}
              value={draftMetricId}
              onChange={(event) => setDraftMetricId(event.target.value)}
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.entities.bucket.controls.colorByAriaLabel',
                { defaultMessage: 'Color by' }
              )}
              data-test-subj={`entityCentricLabBucketColorBy-${bucketKey}`}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.streams.entityCentricLab.entities.bucket.controls.stat', {
              defaultMessage: 'Stat',
            })}
            fullWidth
            helpText={
              isCategorical
                ? i18n.translate(
                    'xpack.streams.entityCentricLab.entities.bucket.controls.statCategoricalTooltip',
                    {
                      defaultMessage: 'Categorical metrics are always shown using the last value.',
                    }
                  )
                : undefined
            }
          >
            {/*
              Categorical metrics (Phase, Status, Rollout, …) only make
              sense as "Last" — avg/min/max of an enum is meaningless.
              Force the display to `last` and disable the control; the
              help text explains the lock-in. The stored numeric
              preference is preserved so switching back to a numeric
              metric restores the user's last choice.
            */}
            <EuiSelect
              fullWidth
              disabled={isCategorical}
              options={statOptions}
              value={isCategorical ? 'last' : draftStatId}
              onChange={(event) => setDraftStatId(event.target.value as StatId)}
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.entities.bucket.controls.statAriaLabel',
                { defaultMessage: 'Stat' }
              )}
              data-test-subj={`entityCentricLabBucketStat-${bucketKey}`}
            />
          </EuiFormRow>
          {showColoringSection ? (
            <>
              <EuiHorizontalRule margin="m" />
              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.entityCentricLab.entities.bucket.controls.colorMode',
                  { defaultMessage: 'Coloring' }
                )}
                fullWidth
              >
                <EuiButtonGroup
                  isFullWidth
                  buttonSize="compressed"
                  legend={i18n.translate(
                    'xpack.streams.entityCentricLab.entities.bucket.controls.colorModeLegend',
                    { defaultMessage: 'Coloring mode' }
                  )}
                  idSelected={draftColoring.mode}
                  options={[
                    {
                      id: 'severity',
                      label: i18n.translate(
                        'xpack.streams.entityCentricLab.entities.bucket.controls.colorModeSeverity',
                        { defaultMessage: 'Automatic' }
                      ),
                    },
                    {
                      id: 'palette',
                      label: i18n.translate(
                        'xpack.streams.entityCentricLab.entities.bucket.controls.colorModePalette',
                        { defaultMessage: 'Custom' }
                      ),
                    },
                  ]}
                  onChange={(id) => updateColoring({ mode: id as ColorMode })}
                  data-test-subj={`entityCentricLabBucketColorMode-${bucketKey}`}
                  name={colorModeGroupId}
                />
              </EuiFormRow>
              {showPaletteOptions ? (
                <>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.streams.entityCentricLab.entities.bucket.controls.paletteType',
                      { defaultMessage: 'Type' }
                    )}
                    fullWidth
                  >
                    <EuiButtonGroup
                      isFullWidth
                      buttonSize="compressed"
                      legend={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.bucket.controls.paletteTypeLegend',
                        { defaultMessage: 'Palette type' }
                      )}
                      idSelected={draftColoring.type}
                      options={[
                        {
                          id: 'gradient',
                          label: i18n.translate(
                            'xpack.streams.entityCentricLab.entities.bucket.controls.paletteTypeGradient',
                            { defaultMessage: 'Gradient' }
                          ),
                        },
                        {
                          id: 'steps',
                          label: i18n.translate(
                            'xpack.streams.entityCentricLab.entities.bucket.controls.paletteTypeSteps',
                            { defaultMessage: 'Steps' }
                          ),
                        },
                      ]}
                      onChange={(id) => handleTypeChange(id as PaletteType)}
                      data-test-subj={`entityCentricLabBucketPaletteType-${bucketKey}`}
                      name={paletteTypeGroupId}
                    />
                  </EuiFormRow>
                  {draftColoring.type === 'gradient' ? (
                    <>
                      <EuiFormRow
                        label={i18n.translate(
                          'xpack.streams.entityCentricLab.entities.bucket.controls.palette',
                          { defaultMessage: 'Color palette' }
                        )}
                        fullWidth
                      >
                        <EuiColorPalettePicker
                          fullWidth
                          palettes={palettePickerPalettes}
                          valueOfSelected={draftColoring.paletteId}
                          onChange={(value) => updateColoring({ paletteId: value as PaletteId })}
                          selectionDisplay="palette"
                          data-test-subj={`entityCentricLabBucketPalette-${bucketKey}`}
                        />
                      </EuiFormRow>
                      <EuiFormRow
                        label={i18n.translate(
                          'xpack.streams.entityCentricLab.entities.bucket.controls.numberOfColors',
                          { defaultMessage: 'Number of colors' }
                        )}
                        fullWidth
                      >
                        <EuiRange
                          fullWidth
                          min={MIN_STEPS}
                          max={MAX_STEPS}
                          step={1}
                          showInput
                          value={draftColoring.steps}
                          onChange={(event) =>
                            updateColoring({ steps: Number(event.currentTarget.value) })
                          }
                          data-test-subj={`entityCentricLabBucketPaletteSteps-${bucketKey}`}
                        />
                      </EuiFormRow>
                      <EuiFormRow fullWidth>
                        <EuiSwitch
                          label={i18n.translate(
                            'xpack.streams.entityCentricLab.entities.bucket.controls.reverse',
                            { defaultMessage: 'Reverse direction' }
                          )}
                          checked={draftColoring.reverse}
                          onChange={(event) => updateColoring({ reverse: event.target.checked })}
                          data-test-subj={`entityCentricLabBucketPaletteReverse-${bucketKey}`}
                        />
                      </EuiFormRow>
                      <EuiFormRow fullWidth>
                        <EuiSwitch
                          label={i18n.translate(
                            'xpack.streams.entityCentricLab.entities.bucket.controls.autoRange',
                            { defaultMessage: 'Auto calculate range' }
                          )}
                          checked={draftColoring.autoRange}
                          onChange={(event) => updateColoring({ autoRange: event.target.checked })}
                          data-test-subj={`entityCentricLabBucketPaletteAutoRange-${bucketKey}`}
                        />
                      </EuiFormRow>
                      {draftColoring.autoRange ? null : (
                        <EuiFlexGroup gutterSize="m" responsive={false}>
                          <EuiFlexItem>
                            <EuiFormRow
                              label={i18n.translate(
                                'xpack.streams.entityCentricLab.entities.bucket.controls.min',
                                { defaultMessage: 'Minimum' }
                              )}
                              fullWidth
                            >
                              <EuiFieldNumber
                                fullWidth
                                value={draftColoring.min ?? ''}
                                onChange={(event) =>
                                  updateColoring({
                                    min:
                                      event.target.value === '' ? null : Number(event.target.value),
                                  })
                                }
                                data-test-subj={`entityCentricLabBucketPaletteMin-${bucketKey}`}
                              />
                            </EuiFormRow>
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiFormRow
                              label={i18n.translate(
                                'xpack.streams.entityCentricLab.entities.bucket.controls.max',
                                { defaultMessage: 'Maximum' }
                              )}
                              fullWidth
                            >
                              <EuiFieldNumber
                                fullWidth
                                value={draftColoring.max ?? ''}
                                onChange={(event) =>
                                  updateColoring({
                                    max:
                                      event.target.value === '' ? null : Number(event.target.value),
                                  })
                                }
                                data-test-subj={`entityCentricLabBucketPaletteMax-${bucketKey}`}
                              />
                            </EuiFormRow>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      )}
                    </>
                  ) : (
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.bucket.controls.thresholds',
                        { defaultMessage: 'Thresholds' }
                      )}
                      helpText={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.bucket.controls.stepsHelp',
                        {
                          defaultMessage:
                            'A tile takes the colour of the highest threshold its value reaches.',
                        }
                      )}
                      fullWidth
                    >
                      <StepRulesEditor
                        bucketKey={bucketKey}
                        rules={draftColoring.rules ?? defaultStepRules}
                        newStepColor={euiTheme.colors.textSubdued}
                        onChange={(rules) => updateColoring({ rules })}
                      />
                    </EuiFormRow>
                  )}
                </>
              ) : null}
            </>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              data-test-subj={`entityCentricLabBucketControlsFlyoutCancel-${bucketKey}`}
            >
              {i18n.translate(
                'xpack.streams.entityCentricLab.entities.bucket.controls.flyoutCancel',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={!isDirty}
              onClick={handleApply}
              data-test-subj={`entityCentricLabBucketControlsFlyoutApply-${bucketKey}`}
            >
              {i18n.translate(
                'xpack.streams.entityCentricLab.entities.bucket.controls.flyoutApply',
                { defaultMessage: 'Apply' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

const CategoryHeader = ({
  category,
  total,
  label,
}: {
  category: EntityCategoryId;
  total: number;
  /**
   * Overrides the category label. Used when a card is scoped to a single
   * sub-type (e.g. a Cloud page filtered to just EC2) so the header reads
   * "AWS EC2 instance" instead of the generic "Cloud".
   */
  label?: string;
}) => {
  const descriptor = getCategoryDescriptor(category);
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {descriptor?.icon ? (
        <EuiFlexItem grow={false}>
          <EuiIcon type={descriptor.icon} size="m" aria-hidden />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h4>{label ?? descriptor?.label ?? category}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// ---------------------------------------------------------------------------
// Sub-type row (controls + legend + tiles for one entity-type bucket)
// ---------------------------------------------------------------------------

/**
 * Resolve the low / high bounds for a bucket's palette ramp. Returns
 * null for categorical metrics (no numeric spread to stretch a ramp
 * across). Recomputes the same deterministic readings the tile row
 * uses, so the legend and the tiles always agree on the range.
 */
const computePaletteRange = (
  entities: readonly Entity[],
  metric: MetricDescriptor,
  statId: StatId,
  coloring: ColoringConfig
): { readonly min: number; readonly max: number } | null => {
  if (metric.kind !== 'numeric') return null;
  const effectiveStat = effectiveStatForMetric(metric, statId);
  const values = entities.map(
    (entity) =>
      resolveMetricReading(entity.name, metric, effectiveStat, entity.health).rawValue ?? 0
  );
  return resolveColoringRange(values, metric.range, coloring);
};

interface SubTypeRowProps {
  /**
   * Persistence key for the per-row Color-by / Stat selection. Caller
   * computes it via {@link bucketKeyFor} so the same key is used in
   * both the K8s sub-row layout (`kubernetes:pods`) and the generic
   * non-K8s multi-type layout (`hosts:bare-metal`, `cloud:aws region`).
   */
  readonly bucketKey: BucketKey;
  readonly label: string;
  readonly entities: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
}

/**
 * One sub-row inside a multi-type category card. Renders an inline
 * `<label> (<count>)` header, the per-bucket Color-by + Stat
 * controls, a compact legend and the tile row. Used by both
 * `KubernetesCard` (one row per K8s sub-type) and `MultiTypeCard` (one
 * row per non-K8s entity `.type`) so the two layouts stay
 * pixel-identical.
 */
const SubTypeRow = ({ bucketKey, label, entities, onSelectEntity }: SubTypeRowProps) => {
  const paletteEnabled = useContext(PaletteColoringEnabledContext);
  const { selection, setSelection } = useBucketMetricSelection(bucketKey);
  // Validate metric against the current catalog; if a persisted id is
  // unknown (catalog drift) the hook returns the bucket default — fall
  // back gracefully so the row still renders.
  const metric = findMetric(bucketKey, selection.metricId) ?? getBucketMetrics(bucketKey)[0];
  const { coloring } = selection;
  // Steps no longer needs persisted rules to be active — unedited buckets
  // derive defaults from the metric (see `effectiveStepRules`).
  const paletteActive = paletteEnabled && coloring.mode === 'palette' && metric.kind === 'numeric';
  const paletteRange = useMemo(
    () =>
      paletteActive && coloring.type === 'gradient'
        ? computePaletteRange(entities, metric, selection.statId, coloring)
        : null,
    [paletteActive, coloring, entities, metric, selection.statId]
  );
  const coloringForRender = paletteActive ? coloring : null;
  return (
    <div data-test-subj={`entityCentricLabBucket-${bucketKey}`}>
      {/* Row 1: sub-type label + count on the left, dropdowns on the
          right. No leading column pushing tiles to the right — the
          tiles span the full card width below. */}
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{label}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{entities.length.toLocaleString()}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <BucketMetricControls
            bucketKey={bucketKey}
            label={label}
            metric={metric}
            statId={selection.statId}
            coloring={selection.coloring}
            enablePaletteColoring={paletteEnabled}
            onApply={setSelection}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {/* Row 2: legend swatches so users can decode the tone palette
          without having to hover every tile. */}
      <BucketMetricLegend
        metric={metric}
        coloring={coloringForRender}
        paletteRange={paletteRange}
      />
      <EuiSpacer size="s" />
      {/* Row 3: tiles span the full card width — no indentation. */}
      <BucketTileRow
        entities={entities}
        metric={metric}
        statId={selection.statId}
        onSelectEntity={onSelectEntity}
        coloring={coloringForRender}
        paletteRange={paletteRange}
      />
    </div>
  );
};

/**
 * Group entities by their `.type` string and return them in a stable
 * order: largest groups first, ties broken alphabetically. The order
 * is deterministic across renders so re-renders never visually
 * shuffle the sub-rows.
 *
 * Caller is responsible for deciding *whether* to render sub-rows —
 * see {@link CategoryCard} for the "multi-type if > 1 distinct
 * `.type`" rule.
 */
const groupEntitiesByType = (
  entities: readonly Entity[]
): Array<{ label: string; rows: Entity[] }> => {
  const buckets = new Map<string, Entity[]>();
  for (const entity of entities) {
    const list = buckets.get(entity.type) ?? [];
    list.push(entity);
    buckets.set(entity.type, list);
  }
  return Array.from(buckets.entries())
    .map(([label, rows]) => ({ label, rows }))
    .sort((a, b) => {
      const sizeDelta = b.rows.length - a.rows.length;
      if (sizeDelta !== 0) return sizeDelta;
      return a.label.localeCompare(b.label);
    });
};

// ---------------------------------------------------------------------------
// Kubernetes card
// ---------------------------------------------------------------------------

const KubernetesCard = ({
  entities,
  onSelectEntity,
}: {
  entities: readonly Entity[];
  onSelectEntity: (entityName: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const subRowClass = css`
    padding: ${euiTheme.size.s} 0;
    border-top: ${euiTheme.border.thin};
  `;

  // Cluster filter state — transient (not persisted) so it behaves
  // like every other filter on the page: navigate away and it resets
  // to "All clusters".
  const [clusterFilter, setClusterFilter] = useState<string>(KUBERNETES_CLUSTER_FILTER_ALL);

  const clusterNames = useMemo(() => getKubernetesClusterNames(entities), [entities]);

  const visibleEntities = useMemo(
    () => filterEntitiesByCluster(entities, clusterFilter, clusterNames),
    [entities, clusterFilter, clusterNames]
  );

  const groupedBySubType = useMemo(() => {
    const groups = new Map<string, Entity[]>();
    for (const entity of visibleEntities) {
      const key = entity.subType ?? 'Other';
      const list = groups.get(key) ?? [];
      list.push(entity);
      groups.set(key, list);
    }
    return groups;
  }, [visibleEntities]);

  // Preserve the canonical sub-type ordering when some sub-types are
  // still present after filtering; rendering nothing if a sub-type
  // has zero matches keeps the card compact.
  const orderedSubTypes = useMemo(
    () =>
      KUBERNETES_SUB_TYPE_ORDER.map((label) => ({
        label,
        rows: groupedBySubType.get(label) ?? [],
      })).filter((group) => group.rows.length > 0),
    [groupedBySubType]
  );

  if (entities.length === 0) {
    return null;
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <CategoryHeader category="kubernetes" total={visibleEntities.length} />
        </EuiFlexItem>
        <EuiFlexItem />
        {clusterNames.length > 0 ? (
          <EuiFlexItem grow={false}>
            <KubernetesClusterFilter
              clusterNames={clusterNames}
              value={clusterFilter}
              onChange={setClusterFilter}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {orderedSubTypes.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.streams.entityCentricLab.entities.bucket.kubernetes.clusterFilter.empty',
            { defaultMessage: 'No Kubernetes entities match the current cluster filter.' }
          )}
        </EuiText>
      ) : (
        orderedSubTypes.map((group, index) => (
          <div key={group.label} className={index === 0 ? undefined : subRowClass}>
            <SubTypeRow
              bucketKey={bucketKeyFor('kubernetes', group.label)}
              label={group.label}
              entities={group.rows}
              onSelectEntity={onSelectEntity}
            />
            {index === 0 ? <EuiSpacer size="s" /> : null}
          </div>
        ))
      )}
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// Multi-type category card (Hosts, Cloud, Middlewares, LLMs when they
// have entities of more than one `.type`)
// ---------------------------------------------------------------------------

/**
 * Same shell as `KubernetesCard` minus the cluster filter: one outer
 * panel with the category header at the top and a `SubTypeRow` per
 * distinct `.type`. Triggered by `CategoryCard` whenever a non-K8s
 * category has more than one `.type` value in its entity list (e.g.
 * Hosts → Bare-metal + VM, Cloud → AWS region + EC2 + Lambda + S3),
 * so the grouped grid mirrors what the user sees in the Type column
 * of the entities list.
 */
const MultiTypeCategoryCard = ({
  category,
  entities,
  onSelectEntity,
}: {
  category: EntityCategoryId;
  entities: readonly Entity[];
  onSelectEntity: (entityName: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const subRowClass = css`
    padding: ${euiTheme.size.s} 0;
    border-top: ${euiTheme.border.thin};
  `;

  const orderedTypes = useMemo(() => groupEntitiesByType(entities), [entities]);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <CategoryHeader category={category} total={entities.length} />
      <EuiSpacer size="m" />
      {orderedTypes.map((group, index) => (
        <div key={group.label} className={index === 0 ? undefined : subRowClass}>
          <SubTypeRow
            bucketKey={bucketKeyFor(category, group.label)}
            label={group.label}
            entities={group.rows}
            onSelectEntity={onSelectEntity}
          />
          {index === 0 ? <EuiSpacer size="s" /> : null}
        </div>
      ))}
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// Cloud provider card (Cloud > provider > service)
// ---------------------------------------------------------------------------

const CloudProviderHeader = ({
  provider,
  total,
}: {
  provider: CloudProviderDescriptor;
  total: number;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={provider.icon} size="m" aria-hidden />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <h4>{provider.label}</h4>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/**
 * One panel per cloud provider, with a `SubTypeRow` per service in the
 * canonical descriptor order. Services with no entities in the current
 * (filtered) slice are skipped so the panel stays compact. Bucket keys
 * reuse the entity `.type` so AWS keeps its per-service metric catalogs
 * and GCP/Azure fall back to the shared Cloud catalog.
 */
const CloudProviderCard = ({
  provider,
  entities,
  onSelectEntity,
}: {
  provider: CloudProviderDescriptor;
  entities: readonly Entity[];
  onSelectEntity: (entityName: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const subRowClass = css`
    padding: ${euiTheme.size.s} 0;
    border-top: ${euiTheme.border.thin};
  `;

  const serviceGroups = useMemo(
    () =>
      provider.services
        .map((service) => ({
          service,
          rows: entities.filter((entity) => entity.type === service.entityType),
        }))
        .filter((group) => group.rows.length > 0),
    [provider.services, entities]
  );

  if (serviceGroups.length === 0) {
    return null;
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <CloudProviderHeader provider={provider} total={entities.length} />
      <EuiSpacer size="m" />
      {serviceGroups.map((group, index) => (
        <div key={group.service.id} className={index === 0 ? undefined : subRowClass}>
          <SubTypeRow
            bucketKey={bucketKeyFor('cloud', group.service.entityType)}
            label={group.service.label}
            entities={group.rows}
            onSelectEntity={onSelectEntity}
          />
          {index === 0 ? <EuiSpacer size="s" /> : null}
        </div>
      ))}
    </EuiPanel>
  );
};

/**
 * Renders one {@link CloudProviderCard} per provider present in the
 * (already category-scoped) cloud slice, in canonical provider order.
 */
const CloudGroupedCards = ({
  entities,
  onSelectEntity,
}: {
  entities: readonly Entity[];
  onSelectEntity: (entityName: string) => void;
}) => {
  const providerGroups = useMemo(
    () =>
      CLOUD_PROVIDERS.map((provider) => ({
        provider,
        rows: entities.filter((entity) => entity.provider === provider.id),
      })).filter((group) => group.rows.length > 0),
    [entities]
  );

  return (
    <>
      {providerGroups.map((group) => (
        <EuiFlexItem key={group.provider.id} grow={false}>
          <CloudProviderCard
            provider={group.provider}
            entities={group.rows}
            onSelectEntity={onSelectEntity}
          />
        </EuiFlexItem>
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// Non-Kubernetes category card
// ---------------------------------------------------------------------------

const CategoryCard = ({
  category,
  entities,
  onSelectEntity,
}: {
  category: EntityCategoryId;
  entities: readonly Entity[];
  onSelectEntity: (entityName: string) => void;
}) => {
  if (category === 'kubernetes') {
    return <KubernetesCard entities={entities} onSelectEntity={onSelectEntity} />;
  }
  if (entities.length === 0) {
    return null;
  }
  // Detect "multi-type" via a tiny set scan instead of going through
  // `groupEntitiesByType` so we don't pay the sort cost just to
  // decide which card to render. Short-circuits on the second
  // distinct type — no allocations beyond the set itself.
  const distinctTypes = new Set<string>();
  for (const entity of entities) {
    distinctTypes.add(entity.type);
    if (distinctTypes.size > 1) break;
  }
  if (distinctTypes.size > 1) {
    return (
      <MultiTypeCategoryCard
        category={category}
        entities={entities}
        onSelectEntity={onSelectEntity}
      />
    );
  }
  // Cloud is a container of services; when a page is scoped to a single
  // service (EC2 / Lambda / S3 / …) all rows share one `.type`, so key the
  // card on that type instead of the generic `cloud` bucket. This restores
  // the service label in the header *and* the service-specific metric catalog
  // (CLOUD_AWS_EC2_METRICS, …) — matching what a sub-type row would show in
  // the unscoped multi-service view.
  const single = entities[0];
  if (category === 'cloud' && single.subType) {
    return (
      <CategoryCardInner
        bucketKey={bucketKeyFor(category, single.type)}
        category={category}
        entities={entities}
        onSelectEntity={onSelectEntity}
        labelOverride={single.type}
      />
    );
  }
  const bucketKey = bucketKeyFor(category);
  return (
    <CategoryCardInner
      bucketKey={bucketKey}
      category={category}
      entities={entities}
      onSelectEntity={onSelectEntity}
    />
  );
};

interface CategoryCardInnerProps {
  readonly bucketKey: BucketKey;
  readonly category: EntityCategoryId;
  readonly entities: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
  /** Header/label override for single sub-type scoping (e.g. Cloud → EC2). */
  readonly labelOverride?: string;
}

/**
 * Inner card so the per-bucket selection hook is mounted in its own
 * component tree — keeps the hook call site cleanly scoped to the
 * bucket key (no conditional hook calls).
 */
const CategoryCardInner = ({
  bucketKey,
  category,
  entities,
  onSelectEntity,
  labelOverride,
}: CategoryCardInnerProps) => {
  const paletteEnabled = useContext(PaletteColoringEnabledContext);
  const { selection, setSelection } = useBucketMetricSelection(bucketKey);
  const metric = findMetric(bucketKey, selection.metricId) ?? getBucketMetrics(bucketKey)[0];
  const categoryLabel = labelOverride ?? getCategoryDescriptor(category)?.label ?? category;
  const { coloring } = selection;
  // Steps no longer needs persisted rules to be active — unedited buckets
  // derive defaults from the metric (see `effectiveStepRules`).
  const paletteActive = paletteEnabled && coloring.mode === 'palette' && metric.kind === 'numeric';
  const paletteRange = useMemo(
    () =>
      paletteActive && coloring.type === 'gradient'
        ? computePaletteRange(entities, metric, selection.statId, coloring)
        : null,
    [paletteActive, coloring, entities, metric, selection.statId]
  );
  const coloringForRender = paletteActive ? coloring : null;
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj={`entityCentricLabBucket-${bucketKey}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <CategoryHeader category={category} total={entities.length} label={labelOverride} />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <BucketMetricControls
            bucketKey={bucketKey}
            label={categoryLabel}
            metric={metric}
            statId={selection.statId}
            coloring={selection.coloring}
            enablePaletteColoring={paletteEnabled}
            onApply={setSelection}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {/* Legend pairs visually with the controls above so users can map
          a Color-by choice straight to its tone palette before scanning
          the tile row. */}
      <BucketMetricLegend
        metric={metric}
        coloring={coloringForRender}
        paletteRange={paletteRange}
      />
      <EuiSpacer size="s" />
      <BucketTileRow
        entities={entities}
        metric={metric}
        statId={selection.statId}
        onSelectEntity={onSelectEntity}
        coloring={coloringForRender}
        paletteRange={paletteRange}
      />
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export const GroupedGridView = ({
  entities,
  onSelectEntity,
  selectedEntityName = null,
  groupCloudByProvider = false,
  enablePaletteColoring = false,
  refreshTick = 0,
}: Props) => {
  // Subscribe to chaos-mode flips so PayFlow storyline tiles can
  // swap colour the moment the user rolls back. `getEffectiveEntityHealth`
  // is a no-op for everything outside the storyline, so the rest of
  // the grid still honours dataset-defined health.
  const chaosOn = useChaosModeEnabled();
  const effectiveEntities = useMemo<Entity[]>(
    () =>
      entities.map((entity) => {
        const effective = getEffectiveEntityHealth(entity.name, entity.health, chaosOn);
        return effective === entity.health ? entity : { ...entity, health: effective };
      }),
    [entities, chaosOn]
  );

  const grouped = useMemo(() => {
    const buckets = new Map<EntityCategoryId, Entity[]>();
    for (const entity of effectiveEntities) {
      const list = buckets.get(entity.category) ?? [];
      list.push(entity);
      buckets.set(entity.category, list);
    }
    return ENTITY_CATEGORIES.map((descriptor) => ({
      category: descriptor.id,
      rows: buckets.get(descriptor.id) ?? [],
    })).filter((section) => section.rows.length > 0);
  }, [effectiveEntities]);

  if (grouped.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="filter"
        title={
          <h2>
            {i18n.translate('xpack.streams.entityCentricLab.entities.grid.empty.title', {
              defaultMessage: 'No entities match your filters',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.entities.grid.empty.body', {
                defaultMessage: 'Try removing one or more filters to see entities.',
              })}
            </p>
          </EuiText>
        }
      />
    );
  }

  return (
    <SelectedEntityContext.Provider value={selectedEntityName}>
      <PaletteColoringEnabledContext.Provider value={enablePaletteColoring}>
        <RefreshTickContext.Provider value={refreshTick}>
          <EuiFlexGroup direction="column" gutterSize="m">
            {grouped.map((section) =>
              section.category === 'cloud' && groupCloudByProvider ? (
                <CloudGroupedCards
                  key={section.category}
                  entities={section.rows}
                  onSelectEntity={onSelectEntity}
                />
              ) : (
                <EuiFlexItem key={section.category} grow={false}>
                  <CategoryCard
                    category={section.category}
                    entities={section.rows}
                    onSelectEntity={onSelectEntity}
                  />
                </EuiFlexItem>
              )
            )}
          </EuiFlexGroup>
        </RefreshTickContext.Provider>
      </PaletteColoringEnabledContext.Provider>
    </SelectedEntityContext.Provider>
  );
};
