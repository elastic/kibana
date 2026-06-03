/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
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
import {
  STAT_OPTIONS,
  bucketKeyFor,
  effectiveStatForMetric,
  findMetric,
  getBucketMetrics,
  getMetricLegend,
  getStatLabel,
  resolveMetricReading,
  toneColor,
  type BucketKey,
  type MetricDescriptor,
  type MetricReading,
  type MetricTone,
  type StatId,
} from './bucket_metrics';
import { useBucketMetricSelection } from './use_bucket_metric_selection';
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
}

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

interface MetricTileProps {
  readonly entity: Entity;
  readonly metric: MetricDescriptor;
  readonly statId: StatId;
  readonly reading: MetricReading;
  readonly euiTheme: EuiThemeComputed;
  readonly onSelectEntity: (entityName: string) => void;
}

const MetricTile = ({
  entity,
  metric,
  statId,
  reading,
  euiTheme,
  onSelectEntity,
}: MetricTileProps) => {
  // Resolve through the shared store so a wizard `displayField` change
  // re-labels the tooltip immediately. Stable hash-derived values keep
  // every tile uniquely addressable even when the user picks something
  // like `kubernetes.pod.uid` for the entire kind.
  const displayName = useEntityDisplayName(entity.name, entity.type);
  const tileClass = useMemo(
    () => css`
      width: 22px;
      height: 22px;
      border-radius: 4px;
      background-color: ${toneColor(reading.tone, euiTheme)};
      flex: 0 0 22px;
      padding: 0;
      border: none;
      cursor: pointer;
    `,
    [reading.tone, euiTheme]
  );
  const tooltipContent = i18n.translate(
    'xpack.streams.entityCentricLab.entities.metricTileTooltip',
    {
      defaultMessage: '{entityName} — {metricLabel} ({stat}): {value}',
      values: {
        entityName: displayName,
        metricLabel: metric.label,
        stat: getStatLabel(statId),
        value: reading.displayValue,
      },
    }
  );
  return (
    <EuiToolTip content={tooltipContent}>
      <button
        type="button"
        className={tileClass}
        aria-label={tooltipContent}
        // Stable test-subj uses the canonical name so existing
        // selectors keep working even when the user re-labels via the
        // wizard or swaps the bucket metric.
        data-test-subj={`entityCentricLabHealthTile-${entity.name}`}
        onClick={() => onSelectEntity(entity.name)}
      />
    </EuiToolTip>
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
  // header (and with the list-view count). The wrap+flex layout
  // handles large pods/containers buckets gracefully.
  const containerClass = css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  `;
  return (
    <div className={containerClass} role="list">
      {ordered.map(({ entity, reading }) => (
        <MetricTile
          key={entity.id}
          entity={entity}
          metric={metric}
          statId={effectiveStat}
          reading={reading}
          euiTheme={euiTheme}
          onSelectEntity={onSelectEntity}
        />
      ))}
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
      border-radius: 2px;
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
  readonly metric: MetricDescriptor;
  readonly statId: StatId;
  readonly onMetricChange: (metricId: string) => void;
  readonly onStatChange: (statId: StatId) => void;
}

// Fixed widths so every bucket on the page shows the same "Color by"
// and "Stat" controls regardless of the metric labels they expose.
// `Color by` is wide enough for the longest catalogue entry
// ("Memory limit utilization"); `Stat` only needs room for "Average".
const COLOR_BY_WIDTH = 200;
const STAT_WIDTH = 110;

/**
 * Two compact dropdowns rendered next to a bucket header. Labels sit
 * inline to the left of each input — keeps the controls a single row
 * tall, matching the bucket header's height. Fixed input widths keep
 * the controls visually aligned across every bucket on the page so
 * the Kubernetes sub-rows and the cross-category cards all read as
 * one unified UI.
 */
const BucketMetricControls = ({
  bucketKey,
  metric,
  statId,
  onMetricChange,
  onStatChange,
}: BucketMetricControlsProps) => {
  const metrics = getBucketMetrics(bucketKey);
  const metricOptions = useMemo(
    () => metrics.map((descriptor) => ({ value: descriptor.id, text: descriptor.label })),
    [metrics]
  );
  const statOptions = useMemo(
    () => STAT_OPTIONS.map((option) => ({ value: option.id, text: option.label })),
    []
  );
  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.entityCentricLab.entities.bucket.controls.colorBy', {
                defaultMessage: 'Color by',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div style={{ width: COLOR_BY_WIDTH }}>
              <EuiSelect
                compressed
                options={metricOptions}
                value={metric.id}
                onChange={(event) => onMetricChange(event.target.value)}
                aria-label={i18n.translate(
                  'xpack.streams.entityCentricLab.entities.bucket.controls.colorByAriaLabel',
                  { defaultMessage: 'Color by' }
                )}
                data-test-subj={`entityCentricLabBucketColorBy-${bucketKey}`}
              />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.entityCentricLab.entities.bucket.controls.stat', {
                defaultMessage: 'Stat',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div style={{ width: STAT_WIDTH }}>
              {/*
                Categorical metrics (Phase, Status, Rollout, …) only
                make sense as "Last" — avg/min/max of an enum is
                meaningless. Force the display to `last` and disable
                the dropdown; a tooltip explains the lock-in. The
                stored numeric preference is preserved so switching
                back to a numeric metric restores the user's last
                choice.
              */}
              {metric.kind === 'categorical' ? (
                <EuiToolTip
                  position="top"
                  content={i18n.translate(
                    'xpack.streams.entityCentricLab.entities.bucket.controls.statCategoricalTooltip',
                    {
                      defaultMessage: 'Categorical metrics are always shown using the last value.',
                    }
                  )}
                >
                  <EuiSelect
                    compressed
                    disabled
                    options={statOptions}
                    value="last"
                    aria-label={i18n.translate(
                      'xpack.streams.entityCentricLab.entities.bucket.controls.statAriaLabel',
                      { defaultMessage: 'Stat' }
                    )}
                    data-test-subj={`entityCentricLabBucketStat-${bucketKey}`}
                  />
                </EuiToolTip>
              ) : (
                <EuiSelect
                  compressed
                  options={statOptions}
                  value={statId}
                  onChange={(event) => onStatChange(event.target.value as StatId)}
                  aria-label={i18n.translate(
                    'xpack.streams.entityCentricLab.entities.bucket.controls.statAriaLabel',
                    { defaultMessage: 'Stat' }
                  )}
                  data-test-subj={`entityCentricLabBucketStat-${bucketKey}`}
                />
              )}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
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
  const { selection, setMetricId, setStatId } = useBucketMetricSelection(bucketKey);
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
            metric={metric}
            statId={selection.statId}
            onMetricChange={setMetricId}
            onStatChange={setStatId}
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
  const { selection, setMetricId, setStatId } = useBucketMetricSelection(bucketKey);
  const metric = findMetric(bucketKey, selection.metricId) ?? getBucketMetrics(bucketKey)[0];
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
            metric={metric}
            statId={selection.statId}
            onMetricChange={setMetricId}
            onStatChange={setStatId}
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

export const GroupedGridView = ({ entities, onSelectEntity }: Props) => {
  // Subscribe to chaos-mode flips so PayFlow storyline tiles can
  // swap colour the moment the user rolls back. `getEffectiveEntityHealth`
  // is a no-op for everything outside the storyline, so the rest of
  // the grid still honours dataset-defined health.
  const chaosOn = useChaosModeEnabled();
  const effectiveEntities = useMemo<Entity[]>(
    () =>
      entities.map((entity) => {
        const effective = getEffectiveEntityHealth(entity.name, entity.health);
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
    <EuiFlexGroup direction="column" gutterSize="m">
      {grouped.map((section) => (
        <EuiFlexItem key={section.category} grow={false}>
          <CategoryCard
            category={section.category}
            entities={section.rows}
            onSelectEntity={onSelectEntity}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
