/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
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
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
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
  toneColor,
  type BucketKey,
  type MetricDescriptor,
  type MetricReading,
  type MetricTone,
  type StatId,
} from './bucket_metrics';
import { useBucketMetricSelection, type BucketSelection } from './use_bucket_metric_selection';
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
}

/**
 * Canonical name of the currently-selected entity, shared down the deeply
 * nested card/row tree so {@link MetricTile} can flag its own selected state
 * without every intermediate component having to forward the prop.
 */
const SelectedEntityContext = createContext<string | null>(null);

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
      background-color: ${toneColor(reading.tone, euiTheme)};
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
          background-image: linear-gradient(
            ${toneColor(reading.tone, euiTheme)},
            ${toneColor(reading.tone, euiTheme)}
          );
          pointer-events: none;
        }
      `
        : ''}
      &:hover,
      &:focus-visible {
        transform: scale(${Math.min(1, HEX_GAP_SCALE + 0.06)});
      }
    `,
    [reading.tone, euiTheme, isSelected]
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

const sparklineColor = (reading: MetricReading, euiTheme: EuiThemeComputed): string => {
  switch (reading.tone) {
    case 'danger':
      return euiTheme.colors.severity.danger;
    case 'warning':
      return euiTheme.colors.severity.warning;
    default:
      return euiTheme.colors.severity.success;
  }
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
}: {
  hover: TileHover;
  metric: MetricDescriptor;
  statId: StatId;
  euiTheme: EuiThemeComputed;
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
            // light page). Layer the tone over the same light base the tiles
            // use so the swatch reads identically to its square.
            background: `linear-gradient(${toneColor(reading.tone, euiTheme)}, ${toneColor(
              reading.tone,
              euiTheme
            )}), ${euiTheme.colors.emptyShade}`,
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
        <TileSparkline values={sparkline} color={sparklineColor(reading, euiTheme)} />
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
}

const BucketTileRow = ({ entities, metric, statId, onSelectEntity }: BucketTileRowProps) => {
  const { euiTheme } = useEuiTheme();
  // Clamp the stat to "Last" for categorical metrics (Phase, Status,
  // …) since avg/min/max of an enum has no meaning. Resolved here so
  // both the tile color and the tooltip label stay in sync with the
  // (forced) Stat dropdown value above.
  const effectiveStat = effectiveStatForMetric(metric, statId);
  // Resolve every reading once, then sort tiles worst-tone first so
  // the eye lands on trouble. Ties on tone fall back to the entity
  // name for a stable, alphabetic secondary order — important so that
  // tiles keep their position across re-renders and don't visually
  // shuffle when the user picks a different stat (same tone, same
  // sort).
  const ordered = useMemo(() => {
    const withReadings = entities.map((entity) => ({
      entity,
      // Health hint keeps the tile color coherent with the
      // entity-list Health column — `healthy` entities trend green,
      // `atRisk` yellow, `unhealthy` red — so toggling between views
      // doesn't change the story for a given entity.
      reading: resolveMetricReading(entity.name, metric, effectiveStat, entity.health),
    }));
    withReadings.sort((a, b) => {
      const rank = TONE_RANK[a.reading.tone] - TONE_RANK[b.reading.tone];
      if (rank !== 0) return rank;
      return a.entity.name.localeCompare(b.entity.name);
    });
    return withReadings;
  }, [entities, metric, effectiveStat]);
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
        />
      ) : null}
    </div>
  );
};

interface BucketMetricLegendProps {
  readonly metric: MetricDescriptor;
}

/**
 * Compact horizontal legend rendered above each bucket's tile row.
 * One swatch + label per value (categorical metrics) or per severity
 * band (numeric metrics). Wraps gracefully on narrow screens; uses the
 * same tone palette as the tiles themselves so users can decode the
 * grid at a glance without hovering.
 */
const BucketMetricLegend = ({ metric }: BucketMetricLegendProps) => {
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

interface BucketMetricControlsProps {
  readonly bucketKey: BucketKey;
  readonly label: string;
  readonly metric: MetricDescriptor;
  readonly statId: StatId;
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
  onApply,
  onClose,
}: BucketMetricControlsFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'entityCentricLabBucketControlsFlyout' });
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

  const draftMetric = findMetric(bucketKey, draftMetricId) ?? metrics[0];
  const isCategorical = draftMetric.kind === 'categorical';
  const isDirty = draftMetricId !== metric.id || draftStatId !== statId;

  const handleApply = () => {
    onApply({ metricId: draftMetricId, statId: draftStatId });
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

const CategoryHeader = ({ category, total }: { category: EntityCategoryId; total: number }) => {
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
          <h4>{descriptor?.label ?? category}</h4>
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
  const { selection, setSelection } = useBucketMetricSelection(bucketKey);
  // Validate metric against the current catalog; if a persisted id is
  // unknown (catalog drift) the hook returns the bucket default — fall
  // back gracefully so the row still renders.
  const metric = findMetric(bucketKey, selection.metricId) ?? getBucketMetrics(bucketKey)[0];
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
            onApply={setSelection}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {/* Row 2: legend swatches so users can decode the tone palette
          without having to hover every tile. */}
      <BucketMetricLegend metric={metric} />
      <EuiSpacer size="s" />
      {/* Row 3: tiles span the full card width — no indentation. */}
      <BucketTileRow
        entities={entities}
        metric={metric}
        statId={selection.statId}
        onSelectEntity={onSelectEntity}
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
}: CategoryCardInnerProps) => {
  const { selection, setSelection } = useBucketMetricSelection(bucketKey);
  const metric = findMetric(bucketKey, selection.metricId) ?? getBucketMetrics(bucketKey)[0];
  const categoryLabel = getCategoryDescriptor(category)?.label ?? category;
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj={`entityCentricLabBucket-${bucketKey}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <CategoryHeader category={category} total={entities.length} />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <BucketMetricControls
            bucketKey={bucketKey}
            label={categoryLabel}
            metric={metric}
            statId={selection.statId}
            onApply={setSelection}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {/* Legend pairs visually with the controls above so users can map
          a Color-by choice straight to its tone palette before scanning
          the tile row. */}
      <BucketMetricLegend metric={metric} />
      <EuiSpacer size="s" />
      <BucketTileRow
        entities={entities}
        metric={metric}
        statId={selection.statId}
        onSelectEntity={onSelectEntity}
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
    </SelectedEntityContext.Provider>
  );
};
