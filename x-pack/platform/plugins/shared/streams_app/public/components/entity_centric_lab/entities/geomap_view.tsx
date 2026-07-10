/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
  type EuiThemeComputed,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import type { Position } from 'geojson';
import {
  getEffectiveEntityHealth,
  useChaosModeEnabled,
  useEntityDisplayName,
} from '@kbn/entity-centric-lab-flyout';
import type { Entity, EntityHealth } from './fake_entities';
// Low-resolution (110m) world land coastlines, pre-converted from
// TopoJSON to plain [lon, lat] polygon rings so the view needs no map
// plugin or topojson runtime dependency. One entry per land mass; each
// is an array of rings (outer + holes).
import worldLandPolygons from './world_land_polygons.json';

interface Props {
  readonly entities: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
  /**
   * Apply (toggle) a region filter — wired to the shared `region` tag
   * filter so clicking a donut narrows the whole page to that region.
   */
  readonly onSelectRegion: (region: string) => void;
}

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

interface RegionGeo {
  readonly label: string;
  readonly lon: number;
  readonly lat: number;
}

/**
 * Approximate lon/lat for the demo region tags. Coordinates are the
 * real-world cloud-region anchor cities so the donuts land on the right
 * continent; anything not in this table falls back to (0, 0) — see
 * {@link resolveGeo}. First-pass illustrative data only.
 */
const REGION_GEO: Record<string, RegionGeo> = {
  'us-east-1': { label: 'us-east-1', lon: -78.4, lat: 37.9 },
  'us-west-2': { label: 'us-west-2', lon: -122.7, lat: 45.8 },
  'eu-west-1': { label: 'eu-west-1', lon: -8.2, lat: 53.4 },
  'eu-central-1': { label: 'eu-central-1', lon: 8.7, lat: 50.1 },
  'ap-southeast-1': { label: 'ap-southeast-1', lon: 103.8, lat: 1.35 },
  'ap-northeast-1': { label: 'ap-northeast-1', lon: 139.7, lat: 35.7 },
  'sa-east-1': { label: 'sa-east-1', lon: -46.6, lat: -23.5 },
  'af-south-1': { label: 'af-south-1', lon: 18.4, lat: -33.9 },
};

const resolveGeo = (region: string): RegionGeo =>
  REGION_GEO[region] ?? { label: region, lon: 0, lat: 0 };

// Equirectangular projection into an 800 × 400 viewBox (2:1, the natural
// aspect ratio of a full-globe equirectangular map). The land coastlines
// (below) and the region donuts share this exact projection so the
// markers land in the right place.
const MAP_WIDTH = 800;
const MAP_HEIGHT = 400;
// Clip the poles: an equirectangular map wastes a lot of vertical space
// on Antarctica / empty Arctic ocean. Rendering only ~ -60°..+83° keeps
// the populated latitudes filling the panel.
const LAT_TOP = 83;
const LAT_BOTTOM = -60;
const project = (lon: number, lat: number): readonly [number, number] => [
  ((lon + 180) / 360) * MAP_WIDTH,
  ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * MAP_HEIGHT,
];

/**
 * Real world coastlines, projected once at module load. We ship a
 * low-resolution (110m) land TopoJSON and convert it to a set of SVG
 * path strings using the same equirectangular projection as the donuts
 * — no map plugin or runtime map service required.
 */
// Equirectangular can't draw a segment that crosses the antimeridian
// (±180°) — the straight line wraps the whole map and paints a band
// across it (e.g. Russia's far east, which shares a polygon with the
// rest of Eurasia). When two consecutive vertices jump > 180° in
// longitude, close the current sub-path and start a new one instead of
// drawing across.
const ANTIMERIDIAN_JUMP_DEG = 180;

const ringToSubPath = (ring: Position[]): string => {
  let path = '';
  let previousLon: number | null = null;
  for (let index = 0; index < ring.length; index++) {
    const [lon, lat] = ring[index];
    const [x, y] = project(lon, lat);
    const coord = `${x.toFixed(1)} ${y.toFixed(1)}`;
    if (index === 0) {
      path += `M${coord}`;
    } else if (previousLon !== null && Math.abs(lon - previousLon) > ANTIMERIDIAN_JUMP_DEG) {
      path += ` Z M${coord}`;
    } else {
      path += ` L${coord}`;
    }
    previousLon = lon;
  }
  return `${path} Z`;
};

const polygonToPath = (coordinates: Position[][]): string =>
  coordinates.map(ringToSubPath).join(' ');

const LAND_PATHS: readonly string[] = (worldLandPolygons as Position[][][]).map(polygonToPath);

// Flat land fill sampled from the reference map — a light warm gray.
// Hard-coded (rather than an EUI token) because no theme colour reads as
// "map land"; kept subtle so the health donuts stay the focus.
const LAND_FILL = '#e0e0d8';

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

const HEALTH_ORDER: readonly EntityHealth[] = ['healthy', 'atRisk', 'unhealthy'];

// "Show me what's broken first" — sort rank puts unhealthy (red) at the
// top, then at-risk (yellow), then healthy (green). Drives both the
// pre-sort of each region's rows and the table's default/interactive
// health sort.
const HEALTH_RANK: Record<EntityHealth, number> = {
  unhealthy: 0,
  atRisk: 1,
  healthy: 2,
};

interface RegionBucket {
  readonly region: string;
  readonly geo: RegionGeo;
  readonly total: number;
  readonly counts: Record<EntityHealth, number>;
  readonly entities: Entity[];
}

const emptyCounts = (): Record<EntityHealth, number> => ({
  healthy: 0,
  atRisk: 0,
  unhealthy: 0,
});

const buildRegionBuckets = (entities: readonly Entity[]): RegionBucket[] => {
  const map = new Map<string, { counts: Record<EntityHealth, number>; rows: Entity[] }>();
  for (const entity of entities) {
    const region = entity.tags.region;
    const bucket = map.get(region) ?? { counts: emptyCounts(), rows: [] };
    bucket.counts[entity.health] += 1;
    bucket.rows.push(entity);
    map.set(region, bucket);
  }
  return Array.from(map.entries())
    .map(([region, { counts, rows }]) => ({
      region,
      geo: resolveGeo(region),
      total: rows.length,
      counts,
      // Worst-first within each region so the table opens on the
      // problems; ties fall back to name for a stable order.
      entities: rows
        .slice()
        .sort(
          (a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || a.name.localeCompare(b.name)
        ),
    }))
    .sort((a, b) => b.total - a.total || a.region.localeCompare(b.region));
};

// ---------------------------------------------------------------------------
// Donut geometry
// ---------------------------------------------------------------------------

const HEALTH_COLOR = (health: EntityHealth, euiTheme: EuiThemeComputed): string => {
  switch (health) {
    case 'healthy':
      return euiTheme.colors.severity.success;
    case 'atRisk':
      return euiTheme.colors.severity.warning;
    case 'unhealthy':
      return euiTheme.colors.severity.danger;
  }
};

const HEALTH_LABEL: Record<EntityHealth, string> = {
  healthy: i18n.translate('xpack.streams.entityCentricLab.entities.geomap.health.healthy', {
    defaultMessage: 'Healthy',
  }),
  atRisk: i18n.translate('xpack.streams.entityCentricLab.entities.geomap.health.atRisk', {
    defaultMessage: 'At risk',
  }),
  unhealthy: i18n.translate('xpack.streams.entityCentricLab.entities.geomap.health.unhealthy', {
    defaultMessage: 'Unhealthy',
  }),
};

const polarToCartesian = (
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
): readonly [number, number] => {
  // -90° so 0 starts at the top and slices sweep clockwise.
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(angleRad), cy + radius * Math.sin(angleRad)];
};

/**
 * SVG path for one donut segment (an annular wedge) between two angles.
 * Handles the full-circle edge case (a single non-zero health count)
 * by drawing two half-arcs, since an arc from 0 to 360 collapses to
 * nothing.
 */
const donutSegmentPath = (
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string => {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.999) {
    const midAngle = startAngle + 180;
    return [
      donutSegmentPath(cx, cy, rOuter, rInner, startAngle, midAngle),
      donutSegmentPath(cx, cy, rOuter, rInner, midAngle, endAngle),
    ].join(' ');
  }
  const [outerStartX, outerStartY] = polarToCartesian(cx, cy, rOuter, endAngle);
  const [outerEndX, outerEndY] = polarToCartesian(cx, cy, rOuter, startAngle);
  const [innerStartX, innerStartY] = polarToCartesian(cx, cy, rInner, startAngle);
  const [innerEndX, innerEndY] = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${outerEndX} ${outerEndY}`,
    `L ${innerStartX} ${innerStartY}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${innerEndX} ${innerEndY}`,
    'Z',
  ].join(' ');
};

interface HealthDonutProps {
  readonly bucket: RegionBucket;
  readonly maxTotal: number;
  readonly euiTheme: EuiThemeComputed;
  readonly onSelectRegion: (region: string) => void;
  /** Show the hover card at the pointer (mouse enter / move). */
  readonly onPointerHover: (bucket: RegionBucket, event: React.MouseEvent) => void;
  /** Show the hover card anchored on the donut (keyboard focus). */
  readonly onFocusHover: (bucket: RegionBucket) => void;
  /** Hide the hover card (mouse leave / blur). */
  readonly onHoverEnd: () => void;
}

const RADIUS_MIN = 14;
const RADIUS_MAX = 34;

const HealthDonut = ({
  bucket,
  maxTotal,
  euiTheme,
  onSelectRegion,
  onPointerHover,
  onFocusHover,
  onHoverEnd,
}: HealthDonutProps) => {
  const [cx, cy] = project(bucket.geo.lon, bucket.geo.lat);
  // Area-proportional sizing (sqrt) so a region with 4× the resources
  // reads as ~2× the radius rather than 4× — keeps big regions from
  // swallowing the whole map.
  const scale = maxTotal > 0 ? Math.sqrt(bucket.total) / Math.sqrt(maxTotal) : 0;
  const rOuter = RADIUS_MIN + scale * (RADIUS_MAX - RADIUS_MIN);
  const rInner = rOuter * 0.58;

  let angle = 0;
  const segments = HEALTH_ORDER.map((health) => {
    const value = bucket.counts[health];
    const sweep = bucket.total > 0 ? (value / bucket.total) * 360 : 0;
    const start = angle;
    angle += sweep;
    return { health, value, start, end: angle };
  }).filter((segment) => segment.value > 0);

  // Worst tone present drives the soft outer glow: red regions pulse in
  // danger, at-risk regions in warning, healthy ones stay calm (no
  // glow). Draws the eye straight to the trouble spots.
  const glowColor =
    bucket.counts.unhealthy > 0
      ? euiTheme.colors.severity.danger
      : bucket.counts.atRisk > 0
      ? euiTheme.colors.severity.warning
      : null;

  // Hover card (see `DonutTooltip`) replaces the native SVG <title>: it
  // appears instantly, is styled to match the rest of the lab, and shows
  // the full health breakdown with colour swatches. EuiToolTip can't be
  // used here — it wraps its child in an HTML element, which is invalid
  // inside <svg> and drops the <g>.
  return (
    <g
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelectRegion(bucket.region)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelectRegion(bucket.region);
        }
      }}
      onMouseEnter={(event) => onPointerHover(bucket, event)}
      onMouseMove={(event) => onPointerHover(bucket, event)}
      onMouseLeave={onHoverEnd}
      onFocus={() => onFocusHover(bucket)}
      onBlur={onHoverEnd}
      aria-label={i18n.translate('xpack.streams.entityCentricLab.entities.geomap.donut.ariaLabel', {
        defaultMessage:
          'Filter by {region}: {total} resources — {healthy} healthy, {atRisk} at risk, {unhealthy} unhealthy',
        values: {
          region: bucket.geo.label,
          total: bucket.total,
          healthy: bucket.counts.healthy,
          atRisk: bucket.counts.atRisk,
          unhealthy: bucket.counts.unhealthy,
        },
      })}
    >
      {/* Soft coloured glow behind unhealthy / at-risk regions. */}
      {glowColor ? <circle cx={cx} cy={cy} r={rOuter + 7} fill={glowColor} opacity={0.18} /> : null}
      {/* Invisible hit target so the whole marker is easy to click. */}
      <circle cx={cx} cy={cy} r={rOuter + 6} fill="transparent" />
      {/* Donut with a white base + drop shadow so it lifts off the map. */}
      <g filter="url(#geomapDonutShadow)">
        <circle cx={cx} cy={cy} r={rOuter} fill={euiTheme.colors.emptyShade} />
        {segments.length === 1 ? (
          // Single health status: draw one solid ring (outer coloured
          // disc + inner cut-out) instead of wedges, so a uniform region
          // isn't sliced by the white separator strokes.
          <>
            <circle cx={cx} cy={cy} r={rOuter} fill={HEALTH_COLOR(segments[0].health, euiTheme)} />
            <circle cx={cx} cy={cy} r={rInner} fill={euiTheme.colors.emptyShade} />
          </>
        ) : (
          <>
            {segments.map((segment) => (
              <path
                key={segment.health}
                d={donutSegmentPath(cx, cy, rOuter, rInner, segment.start, segment.end)}
                fill={HEALTH_COLOR(segment.health, euiTheme)}
              />
            ))}
            {/* White dividers *between* colour slices only — drawn as
                radial lines at each boundary so the donut keeps a clean
                (un-stroked) outer + inner edge. */}
            {segments.map((segment) => {
              const [innerX, innerY] = polarToCartesian(cx, cy, rInner, segment.start);
              const [outerX, outerY] = polarToCartesian(cx, cy, rOuter, segment.start);
              return (
                <line
                  key={`divider-${segment.health}`}
                  x1={innerX}
                  y1={innerY}
                  x2={outerX}
                  y2={outerY}
                  stroke={euiTheme.colors.emptyShade}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              );
            })}
          </>
        )}
      </g>
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.max(9, rInner * 0.7)}
        fontWeight={700}
        fill={euiTheme.colors.textParagraph}
      >
        {bucket.total}
      </text>
    </g>
  );
};

// ---------------------------------------------------------------------------
// Hover card
// ---------------------------------------------------------------------------

interface HoverState {
  readonly bucket: RegionBucket;
  /** Pointer/anchor position in wrapper-local pixels. */
  readonly x: number;
  readonly y: number;
  /** Flip the card to the pointer's left / top when near an edge. */
  readonly placeLeft: boolean;
  readonly placeAbove: boolean;
}

/**
 * Dark, instantly-appearing hover card for a region donut. Styled to sit
 * above the map (not a native browser tooltip) so it can show the region
 * name, resource total and a colour-swatched health breakdown. Positioned
 * absolutely inside the map wrapper and flipped away from the nearest edge.
 */
const DonutTooltip = ({ hover, euiTheme }: { hover: HoverState; euiTheme: EuiThemeComputed }) => {
  const { bucket, x, y, placeLeft, placeAbove } = hover;
  const OFFSET = 14;
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
        zIndex: 2,
        minWidth: 168,
        maxWidth: 240,
        padding: '8px 12px',
        borderRadius: euiTheme.border.radius.medium,
        // Fixed dark surface (matches the donut drop-shadow colour) so the
        // card reads the same in light or dark theme, like EuiToolTip.
        background: '#1d2a3a',
        color: '#ffffff',
        boxShadow: '0 4px 12px rgba(29, 42, 58, 0.4)',
        fontSize: 12,
        lineHeight: 1.4,
      }}
      data-test-subj="entityCentricLabGeomapTooltip"
    >
      <div style={{ fontWeight: 700 }}>{bucket.geo.label}</div>
      <div style={{ opacity: 0.7, marginBottom: 6 }}>
        {i18n.translate('xpack.streams.entityCentricLab.entities.geomap.tooltip.resources', {
          defaultMessage: '{total, plural, one {# resource} other {# resources}}',
          values: { total: bucket.total },
        })}
      </div>
      <div
        style={{
          height: 1,
          background: 'rgba(255, 255, 255, 0.15)',
          margin: '0 0 6px',
        }}
      />
      {HEALTH_ORDER.map((health) => (
        <div key={health} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: HEALTH_COLOR(health, euiTheme),
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1, opacity: 0.85 }}>{HEALTH_LABEL[health]}</span>
          <span style={{ fontWeight: 600 }}>{bucket.counts[health]}</span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Map panel
// ---------------------------------------------------------------------------

const GeomapPanel = ({
  buckets,
  euiTheme,
  onSelectRegion,
}: {
  buckets: readonly RegionBucket[];
  euiTheme: EuiThemeComputed;
  onSelectRegion: (region: string) => void;
}) => {
  const maxTotal = buckets.reduce((max, bucket) => Math.max(max, bucket.total), 0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  // Position the hover card from a pointer event, in wrapper-local pixels,
  // flipping it away from whichever edge it's closest to so it never spills
  // outside the panel.
  const showHoverFromEvent = (bucket: RegionBucket, event: React.MouseEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    setHover({
      bucket,
      x: localX,
      y: localY,
      placeLeft: localX > rect.width - 240,
      placeAbove: localY > rect.height - 140,
    });
  };

  // Keyboard focus has no pointer — anchor the card on the donut centre,
  // projected from map coordinates into the wrapper's rendered size.
  const showHoverAtCenter = (bucket: RegionBucket) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const [projX, projY] = project(bucket.geo.lon, bucket.geo.lat);
    const localX = (projX / MAP_WIDTH) * rect.width;
    const localY = (projY / MAP_HEIGHT) * rect.height;
    setHover({
      bucket,
      x: localX,
      y: localY,
      placeLeft: localX > rect.width - 240,
      placeAbove: localY > rect.height - 140,
    });
  };

  const hideHover = () => setHover(null);
  // No ocean fill — the panel background shows through. Land is a flat
  // light-brown so the coloured donuts are the only saturated thing on
  // the map.
  const mapClass = css`
    width: 100%;
    height: auto;
    display: block;
    background-color: transparent;
  `;
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.streams.entityCentricLab.entities.geomap.title', {
                defaultMessage: 'Resources by region',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <HealthLegend euiTheme={euiTheme} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div
        ref={wrapperRef}
        className={css`
          position: relative;
          width: 100%;
        `}
      >
        <svg
          className={mapClass}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          data-test-subj="entityCentricLabGeomapCanvas"
        >
          <defs>
            <filter id="geomapDonutShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="1.6"
                floodColor="#1d2a3a"
                floodOpacity="0.35"
              />
            </filter>
          </defs>
          {/* Land — a single flat fill, no coastline stroke or graticule,
            so the coloured markers are the only thing competing for
            attention. */}
          <g>
            {LAND_PATHS.map((path, index) => (
              <path key={index} d={path} fill={LAND_FILL} />
            ))}
          </g>
          {buckets.map((bucket) => (
            <HealthDonut
              key={bucket.region}
              bucket={bucket}
              maxTotal={maxTotal}
              euiTheme={euiTheme}
              onSelectRegion={onSelectRegion}
              onPointerHover={showHoverFromEvent}
              onFocusHover={showHoverAtCenter}
              onHoverEnd={hideHover}
            />
          ))}
        </svg>
        {hover ? <DonutTooltip hover={hover} euiTheme={euiTheme} /> : null}
      </div>
    </EuiPanel>
  );
};

const HealthLegend = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => (
  <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
    {HEALTH_ORDER.map((health) => (
      <EuiFlexItem grow={false} key={health}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: HEALTH_COLOR(health, euiTheme),
                display: 'inline-block',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {HEALTH_LABEL[health]}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

// ---------------------------------------------------------------------------
// Region-grouped list (below the map)
// ---------------------------------------------------------------------------

const EntityNameLink = ({
  entity,
  onSelectEntity,
}: {
  entity: Entity;
  onSelectEntity: (entityName: string) => void;
}) => {
  const displayName = useEntityDisplayName(entity.name, entity.type);
  return (
    <EuiLink
      data-test-subj={`entityCentricLabGeomapEntityRow-${entity.id}`}
      onClick={() => onSelectEntity(entity.name)}
    >
      {displayName}
    </EuiLink>
  );
};

const HEALTH_BADGE_COLOR: Record<EntityHealth, 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  atRisk: 'warning',
  unhealthy: 'danger',
};

const useRegionColumns = (
  onSelectEntity: (entityName: string) => void
): Array<EuiBasicTableColumn<Entity>> =>
  useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.entityCentricLab.entities.geomap.columns.name', {
          defaultMessage: 'Entity name',
        }),
        sortable: true,
        render: (_name: string, row: Entity) => (
          <EntityNameLink entity={row} onSelectEntity={onSelectEntity} />
        ),
      },
      {
        field: 'health',
        name: i18n.translate('xpack.streams.entityCentricLab.entities.geomap.columns.health', {
          defaultMessage: 'Health',
        }),
        width: '120px',
        // Return the severity rank (not the raw enum) so ascending sort
        // reads worst → best (red, yellow, green) instead of alphabetical.
        sortable: (row: Entity) => HEALTH_RANK[row.health],
        render: (health: EntityHealth) => (
          <EuiBadge color={HEALTH_BADGE_COLOR[health]}>{HEALTH_LABEL[health]}</EuiBadge>
        ),
      },
      {
        field: 'type',
        name: i18n.translate('xpack.streams.entityCentricLab.entities.geomap.columns.type', {
          defaultMessage: 'Type',
        }),
        width: '180px',
        sortable: true,
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.entities.geomap.columns.application', {
          defaultMessage: 'Application',
        }),
        width: '140px',
        sortable: (row: Entity) => row.tags.application,
        render: (row: Entity) => <EuiBadge color="hollow">{row.tags.application}</EuiBadge>,
      },
    ],
    [onSelectEntity]
  );

const RegionSection = ({
  bucket,
  columns,
  euiTheme,
  onSelectRegion,
}: {
  bucket: RegionBucket;
  columns: Array<EuiBasicTableColumn<Entity>>;
  euiTheme: EuiThemeComputed;
  onSelectRegion: (region: string) => void;
}) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="m">
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h4>
            <EuiLink
              color="text"
              onClick={() => onSelectRegion(bucket.region)}
              data-test-subj={`entityCentricLabGeomapRegionFilter-${bucket.region}`}
            >
              {bucket.geo.label}
            </EuiLink>
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{bucket.total.toLocaleString()}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem />
      {HEALTH_ORDER.map((health) => (
        <EuiFlexItem grow={false} key={health}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: HEALTH_COLOR(health, euiTheme),
                  display: 'inline-block',
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {bucket.counts[health]}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiInMemoryTable<Entity>
      tableCaption={i18n.translate('xpack.streams.entityCentricLab.entities.geomap.tableCaption', {
        defaultMessage: '{region} entities',
        values: { region: bucket.geo.label },
      })}
      items={bucket.entities}
      columns={columns}
      rowHeader="name"
      sorting={{ sort: { field: 'health', direction: 'asc' } }}
      pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
      data-test-subj={`entityCentricLabGeomapTable-${bucket.region}`}
    />
  </EuiPanel>
);

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export const GeomapView = ({ entities, onSelectEntity, onSelectRegion }: Props) => {
  const { euiTheme } = useEuiTheme();
  const columns = useRegionColumns(onSelectEntity);
  const chaosOn = useChaosModeEnabled();

  const effectiveEntities = useMemo<Entity[]>(
    () =>
      entities.map((entity) => {
        const effective = getEffectiveEntityHealth(entity.name, entity.health, chaosOn);
        return effective === entity.health ? entity : { ...entity, health: effective };
      }),
    [entities, chaosOn]
  );

  const buckets = useMemo(() => buildRegionBuckets(effectiveEntities), [effectiveEntities]);

  if (buckets.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visMapRegion"
        title={
          <h2>
            {i18n.translate('xpack.streams.entityCentricLab.entities.geomap.empty.title', {
              defaultMessage: 'No entities match your filters',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.entities.geomap.empty.body', {
                defaultMessage: 'Try removing one or more filters to see regions on the map.',
              })}
            </p>
          </EuiText>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <GeomapPanel buckets={buckets} euiTheme={euiTheme} onSelectRegion={onSelectRegion} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.streams.entityCentricLab.entities.geomap.listHeading', {
              defaultMessage: 'Entities grouped by region',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      {buckets.map((bucket) => (
        <EuiFlexItem key={bucket.region} grow={false}>
          <RegionSection
            bucket={bucket}
            columns={columns}
            euiTheme={euiTheme}
            onSelectRegion={onSelectRegion}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
