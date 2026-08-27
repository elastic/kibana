/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ElasticOn-only list rendering: one `EuiDataGrid` per table (entity type /
 * sub-type) so the user gets native per-table column controls — reorder and
 * show/hide via the "Columns" toolbar popover, plus a custom "Reset to default"
 * control. Beyond the identity/tag columns the entities list has always shown,
 * the catalog exposes extra identity fields (Type, Subtype, …) and the live
 * per-type metric columns from the hex-map metric catalog (CPU, Memory, …),
 * all hidden by default and addable from the same popover.
 *
 * Column visibility + order is persisted per entity type (keyed by the bucket
 * key, e.g. `kubernetes:pods`, `cloud:aws ec2 instance`) in `localStorage`, so
 * two Pods tables would share one config while Pods and Nodes stay independent.
 * Non-ElasticOn modes keep the classic `EuiInMemoryTable` (see
 * `entities_list_view.tsx`).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiDataGrid,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  type EuiDataGridColumn,
  type EuiDataGridSorting,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEntityDisplayName } from '@kbn/entity-centric-lab-flyout';
import type { Entity, EntityCategoryId, EntityHealth } from './fake_entities';
import { HEALTH_RANK, getCategoryDescriptor } from './fake_entities';
import { CLOUD_PROVIDERS } from './cloud_providers';
import {
  ENTITY_HEALTH_METRIC_ID,
  bucketKeyFor,
  findMetric,
  getBucketMetrics,
  resolveMetricReading,
  resolveMetricSparkline,
  setMetricRefreshSalt,
  type BucketKey,
} from './bucket_metrics';

const HEALTH_BADGE_COLOR: Record<EntityHealth, 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  atRisk: 'warning',
  unhealthy: 'danger',
};

const HEALTH_LABEL: Record<EntityHealth, string> = {
  healthy: i18n.translate('xpack.streams.entityCentricLab.entities.grid.health.healthy', {
    defaultMessage: 'Healthy',
  }),
  atRisk: i18n.translate('xpack.streams.entityCentricLab.entities.grid.health.atRisk', {
    defaultMessage: 'At risk',
  }),
  unhealthy: i18n.translate('xpack.streams.entityCentricLab.entities.grid.health.unhealthy', {
    defaultMessage: 'Unhealthy',
  }),
};

const METRIC_PREFIX = 'metric:';
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const STORAGE_PREFIX = 'entityCentricLab.listColumns.v1:';

interface CatalogColumn {
  readonly id: string;
  readonly label: string;
}

// Identity / tag columns shown by default — mirrors the classic list view so
// the ElasticOn grid opens looking identical.
const BASE_VISIBLE_COLUMNS: readonly CatalogColumn[] = [
  {
    id: 'name',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.name', {
      defaultMessage: 'Entity name',
    }),
  },
  {
    id: 'health',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.health', {
      defaultMessage: 'Health',
    }),
  },
  {
    id: 'application',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.application', {
      defaultMessage: 'Application',
    }),
  },
  {
    id: 'environment',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.environment', {
      defaultMessage: 'Environment',
    }),
  },
  {
    id: 'team',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.team', {
      defaultMessage: 'Team',
    }),
  },
  {
    id: 'region',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.region', {
      defaultMessage: 'Region',
    }),
  },
  {
    id: 'lastHealthChange',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.lastHealthChange', {
      defaultMessage: 'Last health change',
    }),
  },
  {
    id: 'age',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.age', {
      defaultMessage: 'Age',
    }),
  },
  {
    id: 'anomalyDetection',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.anomalyDetection', {
      defaultMessage: 'Anomaly detection',
    }),
  },
];

// Extra identity columns — available via "Add columns", hidden by default.
const BASE_HIDDEN_COLUMNS: readonly CatalogColumn[] = [
  {
    id: 'type',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.type', {
      defaultMessage: 'Type',
    }),
  },
  {
    id: 'subType',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.subType', {
      defaultMessage: 'Subtype',
    }),
  },
  {
    id: 'category',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.category', {
      defaultMessage: 'Category',
    }),
  },
  {
    id: 'provider',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.provider', {
      defaultMessage: 'Cloud provider',
    }),
  },
  {
    id: 'id',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.id', {
      defaultMessage: 'Entity ID',
    }),
  },
];

const DEFAULT_VISIBLE_IDS: readonly string[] = BASE_VISIBLE_COLUMNS.map((column) => column.id);

const PROVIDER_LABEL: Record<string, string> = Object.fromEntries(
  CLOUD_PROVIDERS.map((provider) => [provider.id, provider.label])
);

// ---------------------------------------------------------------------------
// Column-config persistence (per entity type, keyed by bucket key)
// ---------------------------------------------------------------------------

const readVisible = (bucketKey: BucketKey): string[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + bucketKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')
      ? (parsed as string[])
      : null;
  } catch {
    return null;
  }
};

const writeVisible = (bucketKey: BucketKey, ids: readonly string[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + bucketKey, JSON.stringify(ids));
  } catch {
    // localStorage may be unavailable (private mode / quota) — the grid still
    // works for the session, it just won't persist across reloads.
  }
};

const removeVisible = (bucketKey: BucketKey): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + bucketKey);
  } catch {
    // ignore — see writeVisible
  }
};

/**
 * Visible-column state persisted per bucket. Sanitizes stored ids against the
 * live catalog (a metric column can vanish if the type's metric set changes)
 * and re-hydrates when the bucket key changes so a remounted-in-place grid for
 * a different type reads its own config.
 */
const useColumnConfig = (
  bucketKey: BucketKey,
  catalogIds: readonly string[]
): {
  visibleColumns: string[];
  setVisibleColumns: (ids: string[]) => void;
  reset: () => void;
} => {
  const catalogRef = useRef(catalogIds);
  catalogRef.current = catalogIds;

  const sanitize = useCallback(
    (ids: readonly string[]): string[] => ids.filter((id) => catalogRef.current.includes(id)),
    []
  );

  const [visibleColumns, setVisibleColumnsState] = useState<string[]>(() => {
    const stored = readVisible(bucketKey);
    return stored ? sanitize(stored) : [...DEFAULT_VISIBLE_IDS];
  });

  useEffect(() => {
    const stored = readVisible(bucketKey);
    setVisibleColumnsState(stored ? sanitize(stored) : [...DEFAULT_VISIBLE_IDS]);
  }, [bucketKey, sanitize]);

  const setVisibleColumns = useCallback(
    (ids: string[]) => {
      const clean = sanitize(ids);
      setVisibleColumnsState(clean);
      writeVisible(bucketKey, clean);
    },
    [bucketKey, sanitize]
  );

  const reset = useCallback(() => {
    setVisibleColumnsState([...DEFAULT_VISIBLE_IDS]);
    removeVisible(bucketKey);
  }, [bucketKey]);

  return { visibleColumns, setVisibleColumns, reset };
};

// ---------------------------------------------------------------------------
// Cell rendering + sort values
// ---------------------------------------------------------------------------

const NameCell = ({
  entity,
  onSelectEntity,
}: {
  entity: Entity;
  onSelectEntity: (entityName: string) => void;
}) => {
  const displayName = useEntityDisplayName(entity.name, entity.type);
  return (
    <EuiLink
      data-test-subj={`entityCentricLabEntityRow-${entity.id}`}
      onClick={() => onSelectEntity(entity.name)}
    >
      {displayName}
    </EuiLink>
  );
};

const categoryLabel = (category: EntityCategoryId): string =>
  getCategoryDescriptor(category)?.label ?? category;

/**
 * Tiny inline trend line drawn next to a numeric metric value. Auto-scales to
 * the series min/max; 1px of vertical padding keeps the stroke from clipping.
 * Drawn in a neutral blue: faithfully mirroring the hex-map per-type
 * palette/steps coloring here would mean pulling in that (un-exported) config
 * and fill logic, so the sparkline stays a calm, uniform trend indicator.
 */
const CellSparkline = ({ values, color }: { values: readonly number[]; color: string }) => {
  const width = 56;
  const height = 16;
  const pad = 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.25} />
    </svg>
  );
};

const NumericMetricCell = ({
  displayValue,
  series,
  color,
}: {
  displayValue: string;
  series: readonly number[] | null;
  color: string;
}) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span>{displayValue}</span>
    {series && series.length > 1 ? <CellSparkline values={series} color={color} /> : null}
  </span>
);

/** Comparable value for a column, driving manual (in-memory) sorting. */
const sortValueFor = (entity: Entity, columnId: string, bucketKey: BucketKey): string | number => {
  switch (columnId) {
    case 'name':
      return entity.name.toLowerCase();
    case 'health':
      return HEALTH_RANK[entity.health];
    case 'application':
    case 'environment':
    case 'team':
    case 'region':
      return entity.tags[columnId] ?? '';
    case 'lastHealthChange':
      return entity.lastHealthChange;
    case 'age':
      return entity.age;
    case 'anomalyDetection':
      return entity.anomalyDetection;
    case 'type':
      return entity.type;
    case 'subType':
      return entity.subType ?? '';
    case 'category':
      return categoryLabel(entity.category);
    case 'provider':
      return entity.provider ? PROVIDER_LABEL[entity.provider] ?? entity.provider : '';
    case 'id':
      return entity.id;
    default:
      break;
  }
  if (columnId.startsWith(METRIC_PREFIX)) {
    const metric = findMetric(bucketKey, columnId.slice(METRIC_PREFIX.length));
    if (!metric) return '';
    const reading = resolveMetricReading(entity.name, metric, 'last', entity.health);
    // Numeric metrics sort by their synthesized value; categorical ones sort
    // by their displayed label.
    return reading.rawValue ?? reading.displayValue;
  }
  return '';
};

interface Props {
  readonly category: EntityCategoryId;
  readonly subTypeLabel?: string;
  readonly nested?: boolean;
  readonly rows: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
  /** Bumped by the auto-refresh tick so live metric cells re-roll. */
  readonly refreshTick?: number;
}

/**
 * Header rendered above the grid — mirrors the classic `SectionHeader` so the
 * ElasticOn grid and the classic list read the same.
 */
const GridSectionHeader = ({
  category,
  subTypeLabel,
  total,
  nested,
}: {
  category: EntityCategoryId;
  subTypeLabel?: string;
  total: number;
  nested?: boolean;
}) => {
  const descriptor = getCategoryDescriptor(category);
  const heading = nested && subTypeLabel ? subTypeLabel : descriptor?.label ?? category;
  return (
    <EuiText size="s">
      <strong>{heading}</strong> <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
    </EuiText>
  );
};

export const EntityDataGridSection = ({
  category,
  subTypeLabel,
  nested,
  rows,
  onSelectEntity,
  refreshTick,
}: Props) => {
  // Bucket key = entity type identity (Kubernetes groups by sub-type, everyone
  // else by `.type`), matching the hex-map metric catalog so metric columns and
  // the per-type column config line up.
  const bucketKey = useMemo<BucketKey>(() => {
    const first = rows[0];
    const groupLabel = category === 'kubernetes' ? first?.subType ?? first?.type : first?.type;
    return bucketKeyFor(category, groupLabel);
  }, [category, rows]);

  // Metric columns for this bucket (minus the shared "Entity health" metric,
  // which the Health column already covers).
  const metricColumns = useMemo<CatalogColumn[]>(
    () =>
      getBucketMetrics(bucketKey)
        .filter((metric) => metric.id !== ENTITY_HEALTH_METRIC_ID)
        .map((metric) => ({ id: `${METRIC_PREFIX}${metric.id}`, label: metric.label })),
    [bucketKey]
  );

  const catalog = useMemo<CatalogColumn[]>(
    () => [...BASE_VISIBLE_COLUMNS, ...BASE_HIDDEN_COLUMNS, ...metricColumns],
    [metricColumns]
  );
  const catalogIds = useMemo(() => catalog.map((column) => column.id), [catalog]);

  const { visibleColumns, setVisibleColumns, reset } = useColumnConfig(bucketKey, catalogIds);
  const { euiTheme } = useEuiTheme();

  const gridColumns = useMemo<EuiDataGridColumn[]>(
    () =>
      catalog.map((column) => ({
        id: column.id,
        displayAsText: column.label,
        isSortable: true,
        initialWidth:
          column.id === 'name' ? 240 : column.id.startsWith(METRIC_PREFIX) ? 130 : undefined,
      })),
    [catalog]
  );

  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([
    { id: 'health', direction: 'asc' },
  ]);

  const sortedRows = useMemo(() => {
    // Match the grouped grid: the tick perturbs the shared metric salt so
    // metric cells (and metric-sorted order) re-roll on each auto-refresh.
    // Tick 0 keeps the stable salt so nothing else shifts.
    setMetricRefreshSalt(refreshTick ? String(refreshTick) : '');
    const copy = [...rows];
    const sorters =
      sortingColumns.length > 0 ? sortingColumns : [{ id: 'health', direction: 'asc' as const }];
    copy.sort((a, b) => {
      for (const { id, direction } of sorters) {
        const va = sortValueFor(a, id, bucketKey);
        const vb = sortValueFor(b, id, bucketKey);
        let cmp = 0;
        if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
        else cmp = String(va).localeCompare(String(vb));
        if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return copy;
    // refreshTick re-rolls the synthesized metric readings used by sortValueFor.
  }, [rows, sortingColumns, bucketKey, refreshTick]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const entity = sortedRows[rowIndex];
      if (!entity) return null;
      switch (columnId) {
        case 'name':
          return <NameCell entity={entity} onSelectEntity={onSelectEntity} />;
        case 'health':
          return (
            <EuiBadge color={HEALTH_BADGE_COLOR[entity.health]}>
              {HEALTH_LABEL[entity.health]}
            </EuiBadge>
          );
        case 'application':
        case 'environment':
        case 'team':
        case 'region':
          return <EuiBadge color="hollow">{entity.tags[columnId]}</EuiBadge>;
        case 'lastHealthChange':
          return entity.lastHealthChange;
        case 'age':
          return entity.age;
        case 'anomalyDetection':
          return entity.anomalyDetection;
        case 'type':
          return entity.type;
        case 'subType':
          return entity.subType ?? '—';
        case 'category':
          return categoryLabel(entity.category);
        case 'provider':
          return entity.provider ? PROVIDER_LABEL[entity.provider] ?? entity.provider : '—';
        case 'id':
          return entity.id;
        default:
          break;
      }
      if (columnId.startsWith(METRIC_PREFIX)) {
        const metric = findMetric(bucketKey, columnId.slice(METRIC_PREFIX.length));
        if (!metric) return '—';
        const reading = resolveMetricReading(entity.name, metric, 'last', entity.health);
        if (metric.kind !== 'numeric') return reading.displayValue;
        return (
          <NumericMetricCell
            displayValue={reading.displayValue}
            series={resolveMetricSparkline(entity.name, metric, 'last', entity.health)}
            color={euiTheme.colors.primary}
          />
        );
      }
      return null;
    },
    [sortedRows, onSelectEntity, bucketKey, euiTheme]
  );

  const descriptor = getCategoryDescriptor(category);
  const captionLabel = subTypeLabel
    ? `${descriptor?.label ?? category} · ${subTypeLabel}`
    : descriptor?.label ?? category;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <GridSectionHeader
        category={category}
        subTypeLabel={subTypeLabel}
        total={rows.length}
        nested={nested}
      />
      <EuiSpacer size="s" />
      <EuiDataGrid
        aria-label={i18n.translate('xpack.streams.entityCentricLab.entities.grid.ariaLabel', {
          defaultMessage: '{label} entities',
          values: { label: captionLabel },
        })}
        columns={gridColumns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={sortedRows.length}
        renderCellValue={renderCellValue}
        gridStyle={{ border: 'horizontal', header: 'shade', stripes: false }}
        sorting={{ columns: sortingColumns, onSort: setSortingColumns }}
        pagination={{
          pageIndex: safePageIndex,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onChangeItemsPerPage: (size) => {
            setPageSize(size);
            setPageIndex(0);
          },
          onChangePage: setPageIndex,
        }}
        toolbarVisibility={{
          showColumnSelector: { allowHide: true, allowReorder: true },
          showSortSelector: true,
          showDisplaySelector: false,
          showFullScreenSelector: false,
          additionalControls: {
            right: (
              <EuiButtonEmpty
                size="xs"
                color="text"
                iconType="editorUndo"
                onClick={reset}
                data-test-subj={`entityCentricLabGridResetColumns-${bucketKey}`}
              >
                {i18n.translate('xpack.streams.entityCentricLab.entities.grid.resetColumns', {
                  defaultMessage: 'Reset to default',
                })}
              </EuiButtonEmpty>
            ),
          },
        }}
        data-test-subj={
          subTypeLabel
            ? `entityCentricLabEntitiesGrid-${category}-${subTypeLabel.toLowerCase()}`
            : `entityCentricLabEntitiesGrid-${category}`
        }
      />
    </EuiPanel>
  );
};
