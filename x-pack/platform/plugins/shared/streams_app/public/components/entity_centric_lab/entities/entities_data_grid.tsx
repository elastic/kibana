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
import type { EuiDataGridRefProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiDataGridColumn,
  type EuiDataGridSorting,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEntityDisplayName } from '@kbn/entity-centric-lab-flyout';
import type { Entity, EntityCategoryId, EntityHealth } from './fake_entities';
import { HEALTH_RANK, getCategoryDescriptor } from './fake_entities';
import { useVariation } from './variation_context';
import type { PhaseVariation } from './variation_registry';
import { readPageSizeForTable, writePageSizeForTable } from './storage_keys';
import {
  DEFAULT_LIST_DENSITY,
  getListGridStyle,
  type ListDensity,
} from './list_density';
import { CLOUD_PROVIDERS } from './cloud_providers';
import {
  K8S_CONTEXT_KEYS,
  K8S_CONTEXT_LABEL,
  getK8sContextColumnIds,
  getK8sContextValue,
  type K8sContextKey,
} from './kubernetes_hierarchy';
import { buildInventoryFilterCellActions } from './inventory_data_grid_cell_actions';
import {
  isK8sInventoryFilterColumn,
  k8sFilterColumnLabel,
  resolveK8sCellFilterTarget,
  type K8sCellFilterTarget,
} from './k8s_inventory_cell_filter';
import {
  ENTITY_HEALTH_METRIC_ID,
  ENTITY_ALERTS_METRIC_ID,
  alertHintFromEntity,
  bucketKeyFor,
  findMetric,
  getBucketMetrics,
  inventoryGridStatForMetric,
  resolveMetricReading,
  resolveMetricSparkline,
  setMetricRefreshSalt,
  type BucketKey,
} from './bucket_metrics';
import {
  bucketKeyShowsCloudAccountByDefault,
  cloudAccountCellTitle,
  cloudAccountColumnDescription,
  CLOUD_ACCOUNT_COLUMN_ID,
  getCloudAccountDisplayLabel,
} from './cloud_account';
import {
  ColumnHeaderWithInfo,
  alertsGridColumnDescription,
  firstSeenColumnDescription,
  healthColumnDescription,
  lastHealthChangeColumnDescription,
  lastSeenColumnDescription,
  metricColumnDescription,
  metricColumnHeaderLabel,
  uptimeColumnDescription,
} from './column_header_info';

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

const ALERT_BADGE_COLOR: Record<string, 'danger' | 'success' | 'hollow'> = {
  active: 'danger',
  clear: 'success',
  na: 'hollow',
};

const ALERT_SORT_RANK: Record<string, number> = { active: 0, na: 1, clear: 2 };

const alertStatusId = (entity: Entity): string => {
  if (!entity.alerts) return 'na';
  return entity.alerts.active > 0 ? 'active' : 'clear';
};

const alertBadgeLabel = (entity: Entity): string => {
  if (!entity.alerts) return 'No alert set up';
  const { active } = entity.alerts;
  if (active > 0) return `${active} active alert${active > 1 ? 's' : ''}`;
  return '0 active alerts';
};

const METRIC_PREFIX = 'metric:';
const PAGE_SIZE_OPTIONS = [10, 25, 50];
// v3 drops layouts saved before Up time was moved to the far right.
const STORAGE_PREFIX = 'entityCentricLab.listColumns.v3:';

interface CatalogColumn {
  readonly id: string;
  readonly label: string;
  /** Shown in an info icon when the header label does not say what the cell is. */
  readonly description?: string;
}

// Identity / tag columns shown by default. Application and Anomaly
// detection are omitted in ElasticOn (infra-first); this grid is ElasticOn-only.
const BASE_VISIBLE_COLUMNS: readonly CatalogColumn[] = [
  {
    id: 'name',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.name', {
      defaultMessage: 'Name',
    }),
  },
  {
    id: 'health',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.health', {
      defaultMessage: 'Health',
    }),
    description: healthColumnDescription(),
  },
  {
    id: 'alerts',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.alerts', {
      defaultMessage: 'Alerts',
    }),
    description: alertsGridColumnDescription(),
  },
  {
    id: 'lastHealthChange',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.lastHealthChange', {
      defaultMessage: 'Last health change',
    }),
    description: lastHealthChangeColumnDescription(),
  },
  {
    id: 'age',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.uptime', {
      defaultMessage: 'Up time',
    }),
    description: uptimeColumnDescription(),
  },
];

// Extra identity columns — available via "Add columns", hidden by default.
const BASE_HIDDEN_COLUMNS: readonly CatalogColumn[] = [
  {
    id: 'firstSeen',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.firstSeen', {
      defaultMessage: 'First seen',
    }),
    description: firstSeenColumnDescription(),
  },
  {
    id: 'lastSeen',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.lastSeen', {
      defaultMessage: 'Last seen',
    }),
    description: lastSeenColumnDescription(),
  },
  {
    id: 'environment',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.environment', {
      defaultMessage: 'Environment',
    }),
  },
  {
    id: 'region',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.region', {
      defaultMessage: 'Region',
    }),
  },
  {
    id: 'team',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.team', {
      defaultMessage: 'Team',
    }),
  },
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
    id: CLOUD_ACCOUNT_COLUMN_ID,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.cloudAccount', {
      defaultMessage: 'Cloud account',
    }),
    description: cloudAccountColumnDescription(),
  },
  {
    id: 'id',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.grid.columns.id', {
      defaultMessage: 'Resource ID',
    }),
  },
];

const DEFAULT_VISIBLE_IDS: readonly string[] = BASE_VISIBLE_COLUMNS.map((column) => column.id);

const k8sContextCatalogColumn = (id: K8sContextKey): CatalogColumn => ({
  id,
  label: K8S_CONTEXT_LABEL[id],
});

// Metric columns to show by default per entity type. These surface the most
// operationally-relevant signals for each resource kind so the user sees
// actionable data without needing to configure columns.
const DEFAULT_METRICS_BY_BUCKET: Readonly<Record<string, readonly string[]>> = {
  // Kubernetes
  'kubernetes:nodes': ['metric:cpu-util', 'metric:memory-util', 'metric:pod-count'],
  'kubernetes:pods': ['metric:cpu-limit-util', 'metric:memory-limit-util', 'metric:restarts'],
  'kubernetes:deployments': ['metric:available-replicas', 'metric:restarts'],
  'kubernetes:replicasets': ['metric:ready-replicas', 'metric:replica-count'],
  'kubernetes:statefulsets': ['metric:ready-replicas', 'metric:volume-util'],
  'kubernetes:daemonsets': ['metric:available-pct', 'metric:misscheduled'],
  'kubernetes:cronjobs': ['metric:failures-24h', 'metric:avg-duration'],
  'kubernetes:containers': ['metric:cpu-usage', 'metric:memory-usage', 'metric:restarts'],
  'kubernetes:namespaces': ['metric:cpu-usage', 'metric:memory-usage'],
  'kubernetes:clusters': ['metric:api-latency', 'metric:node-count'],
  // Hosts
  hosts: ['metric:cpu-util', 'metric:memory-util', 'metric:disk-util'],
  'hosts:bare-metal': ['metric:cpu-util', 'metric:memory-util', 'metric:disk-util'],
  'hosts:vm': ['metric:cpu-util', 'metric:memory-util', 'metric:disk-util'],
  'hosts:aws ec2 instance': ['metric:cpu-util', 'metric:memory-util', 'metric:disk-util'],
  'hosts:gcp compute engine': ['metric:cpu-util', 'metric:memory-util', 'metric:disk-util'],
  'hosts:azure vm': ['metric:cpu-util', 'metric:memory-util', 'metric:disk-util'],
  // Services
  services: ['metric:latency-p95', 'metric:error-rate', 'metric:throughput'],
  'services:apm service': ['metric:latency-p95', 'metric:error-rate', 'metric:throughput'],
  // Databases
  databases: ['metric:query-latency', 'metric:connection-saturation', 'metric:replication-lag'],
  'databases:postgres': [
    'metric:query-latency',
    'metric:connection-saturation',
    'metric:replication-lag',
  ],
  // Networking
  networking: ['metric:active-connections', 'metric:request-rate', 'metric:error-rate'],
  'networking:nginx': ['metric:active-connections', 'metric:request-rate', 'metric:error-rate'],
  'networking:haproxy': ['metric:active-connections', 'metric:request-rate', 'metric:error-rate'],
  'networking:envoy': ['metric:active-connections', 'metric:request-rate', 'metric:error-rate'],
  // Messaging (middlewares)
  middlewares: ['metric:queue-depth', 'metric:consumer-lag'],
  'middlewares:kafka': ['metric:queue-depth', 'metric:consumer-lag'],
  'middlewares:rabbitmq': ['metric:queue-depth', 'metric:consumer-lag'],
  // AI/ML (llms)
  llms: ['metric:latency-p95', 'metric:error-rate', 'metric:token-spend'],
  'llms:openai': ['metric:latency-p95', 'metric:error-rate', 'metric:token-spend'],
  'llms:anthropic': ['metric:latency-p95', 'metric:error-rate', 'metric:token-spend'],
  // Other (catch-all)
  other: ['metric:cpu-util', 'metric:memory-util', 'metric:error-rate'],
  'other:vault': ['metric:cpu-util', 'metric:memory-util', 'metric:error-rate'],
  'other:jenkins': ['metric:cpu-util', 'metric:memory-util', 'metric:error-rate'],
  'other:custom worker': ['metric:cpu-util', 'metric:memory-util', 'metric:error-rate'],
  // Cloud
  cloud: ['metric:cpu-util', 'metric:memory-util'],
  'cloud:aws ec2 instance': ['metric:cpu-util', 'metric:memory-util', 'metric:network-out'],
  'cloud:aws region': ['metric:api-success', 'metric:throttle-rate', 'metric:spend-mtd'],
  'cloud:aws lambda function': [
    'metric:invocations',
    'metric:error-rate',
    'metric:p99-duration',
    'metric:concurrent-executions',
    'metric:memory-util',
  ],
  'cloud:aws s3 bucket': [
    'metric:request-rate',
    'metric:s3-4xx',
    'metric:first-byte',
    'metric:bucket-size',
    'metric:object-count',
  ],
  // Functions category (same metrics as cloud Lambda)
  'functions:aws lambda function': [
    'metric:invocations',
    'metric:error-rate',
    'metric:p99-duration',
    'metric:concurrent-executions',
    'metric:memory-util',
  ],
  'functions:azure function': [
    'metric:invocations',
    'metric:error-rate',
    'metric:p99-duration',
    'metric:concurrent-executions',
    'metric:memory-util',
  ],
  'functions:gcp cloud function': [
    'metric:invocations',
    'metric:error-rate',
    'metric:p99-duration',
    'metric:concurrent-executions',
    'metric:memory-util',
  ],
  // Storage category (same metrics as cloud S3)
  'storage:aws s3 bucket': [
    'metric:request-rate',
    'metric:s3-4xx',
    'metric:first-byte',
    'metric:bucket-size',
    'metric:object-count',
  ],
  'storage:azure blob storage': [
    'metric:request-rate',
    'metric:s3-4xx',
    'metric:first-byte',
    'metric:bucket-size',
    'metric:object-count',
  ],
  'storage:gcp cloud storage bucket': [
    'metric:request-rate',
    'metric:s3-4xx',
    'metric:first-byte',
    'metric:bucket-size',
    'metric:object-count',
  ],
};

const UPTIME_COLUMN_ID = 'age';

/** Up time is always the last default column, after metrics and context fields. */
const withUptimeLast = (ids: readonly string[]): string[] => {
  if (!ids.includes(UPTIME_COLUMN_ID)) return [...ids];
  return [...ids.filter((id) => id !== UPTIME_COLUMN_ID), UPTIME_COLUMN_ID];
};

/**
 * Column picker lists fields in `columns` definition order. Put this table's
 * default visible set first (same top-to-bottom order as default left-to-right),
 * then every other optional column in catalog order.
 */
const orderCatalogLikeDefaultTable = (
  columns: readonly CatalogColumn[],
  defaultVisibleIds: readonly string[]
): CatalogColumn[] => {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const ordered: CatalogColumn[] = [];
  for (const id of defaultVisibleIds) {
    const column = byId.get(id);
    if (column) {
      ordered.push(column);
      byId.delete(id);
    }
  }
  for (const column of columns) {
    if (byId.has(column.id)) {
      ordered.push(column);
    }
  }
  return ordered;
};

const defaultVisibleIdsFor = (bucketKey: string, isHomogeneous: boolean): string[] => {
  const base = [...DEFAULT_VISIBLE_IDS];
  if (!isHomogeneous) {
    // Mixed-type tables: identity only, plus Type so the mix is readable.
    const typeId = 'type';
    const [name, ...rest] = base;
    return withUptimeLast([name, typeId, ...rest.filter((id) => id !== typeId)]);
  }
  const extra = getK8sContextColumnIds(bucketKey).defaultVisible;
  const metricIds = DEFAULT_METRICS_BY_BUCKET[bucketKey] ?? [];
  const cloudAccountIds = bucketKeyShowsCloudAccountByDefault(bucketKey)
    ? [CLOUD_ACCOUNT_COLUMN_ID]
    : [];
  if (extra.length > 0) {
    const [name, health, ...rest] = base;
    return withUptimeLast([
      name,
      health,
      ...extra,
      ...cloudAccountIds,
      ...rest,
      ...metricIds,
    ]);
  }
  if (cloudAccountIds.length > 0) {
    const [name, health, ...rest] = base;
    return withUptimeLast([name, health, ...cloudAccountIds, ...rest, ...metricIds]);
  }
  return withUptimeLast([...base, ...metricIds]);
};

const rowBucketKey = (category: EntityCategoryId, entity: Entity): BucketKey => {
  const groupLabel = category === 'kubernetes' ? entity.subType ?? entity.type : entity.type;
  return bucketKeyFor(category, groupLabel);
};

/** True when every row shares one metric-catalog identity (Pods table, Clusters table, …). */
const isHomogeneousTypeGroup = (category: EntityCategoryId, rows: readonly Entity[]): boolean => {
  if (rows.length <= 1) return true;
  const first = rowBucketKey(category, rows[0]);
  return rows.every((entity) => rowBucketKey(category, entity) === first);
};

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
  catalogIds: readonly string[],
  defaultVisibleIds: readonly string[]
): {
  visibleColumns: string[];
  setVisibleColumns: (ids: string[]) => void;
  reset: () => void;
} => {
  const catalogRef = useRef(catalogIds);
  catalogRef.current = catalogIds;
  const defaultRef = useRef(defaultVisibleIds);
  defaultRef.current = defaultVisibleIds;

  const sanitize = useCallback(
    (ids: readonly string[]): string[] => ids.filter((id) => catalogRef.current.includes(id)),
    []
  );

  const [visibleColumns, setVisibleColumnsState] = useState<string[]>(() => {
    const stored = readVisible(bucketKey);
    return stored ? sanitize(stored) : [...defaultVisibleIds];
  });

  useEffect(() => {
    const stored = readVisible(bucketKey);
    setVisibleColumnsState(stored ? sanitize(stored) : [...defaultRef.current]);
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
    setVisibleColumnsState([...defaultRef.current]);
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
      <EuiIcon type="expand" size="s" style={{ marginRight: 4 }} />
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
let sparkGradientId = 0;
const CellSparkline = ({ values, color }: { values: readonly number[]; color: string }) => {
  const [gradId] = useState(() => `spark-grad-${++sparkGradientId}`);
  const width = 56;
  const height = 16;
  const pad = 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - pad - ((value - min) / span) * (height - pad * 2),
  }));

  // Build a smooth Catmull-Rom → cubic-bezier SVG path.
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const tension = 6;
    const cp1x = p1.x + (p2.x - p0.x) / tension;
    const cp1y = p1.y + (p2.y - p0.y) / tension;
    const cp2x = p2.x - (p3.x - p1.x) / tension;
    const cp2y = p2.y - (p3.y - p1.y) / tension;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(
      1
    )} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  // Closed area path: line path → bottom-right → bottom-left.
  const areaD = `${d} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" />
    </svg>
  );
};

/**
 * Sparkline that fakes asynchronous, viewport-gated loading: the chart only
 * renders once the cell is scrolled into view *and* a short staggered delay
 * has elapsed (simulating a backend time-series fetch). Cells outside the
 * visible area stay empty until the user scrolls to them.
 *
 * Reliability notes:
 * - `IntersectionObserver` is created in a `requestAnimationFrame` callback
 *   so the element has been laid out by the time the observer first checks —
 *   this avoids the common edge-case where an observer attached in the same
 *   frame as mount never fires for an element already in view.
 * - The delay is seeded from the series data so different cells stagger.
 */
const LazySparkline = ({ values, color }: { values: readonly number[]; color: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Deterministic delay 100–500ms seeded from the first two data points.
  const delay = useMemo(
    () => 100 + Math.round(((values[0] ?? 0) * 137 + (values[1] ?? 0) * 53) % 400),
    [values]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Defer observer creation so the element is laid out first.
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            observer.disconnect();
            timer = setTimeout(() => {
              if (!cancelled) setLoaded(true);
            }, delay);
          }
        },
        { threshold: 0 }
      );
      observer.observe(el);
      // Store for cleanup.
      cleanup.observer = observer;
    });

    const cleanup: { observer?: IntersectionObserver } = {};
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (timer) clearTimeout(timer);
      cleanup.observer?.disconnect();
    };
  }, [delay]);

  return (
    <span ref={ref} style={{ display: 'inline-flex', width: 56, height: 16, flexShrink: 0 }}>
      {loaded ? (
        <span
          style={{
            display: 'inline-flex',
            opacity: 0,
            transition: 'opacity 200ms ease-out',
          }}
          ref={(el) => {
            if (el) requestAnimationFrame(() => { el.style.opacity = '1'; });
          }}
        >
          <CellSparkline values={values} color={color} />
        </span>
      ) : null}
    </span>
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
    {series && series.length > 1 ? <LazySparkline values={series} color={color} /> : null}
  </span>
);

/** Comparable value for a column, driving manual (in-memory) sorting. */
const sortValueFor = (entity: Entity, columnId: string, bucketKey: BucketKey): string | number => {
  switch (columnId) {
    case 'name':
      return entity.name.toLowerCase();
    case 'health':
      return HEALTH_RANK[entity.health];
    case 'alerts': {
      const rank = ALERT_SORT_RANK[alertStatusId(entity)] ?? 2;
      const count = entity.alerts?.active ?? 0;
      // Within the "firing" group, sort by count descending (worst first).
      // Encode as rank * 10000 - count so higher counts sort earlier.
      return rank * 10000 - count;
    }
    case 'application':
    case 'environment':
    case 'team':
    case 'region':
      return entity.tags[columnId] ?? '';
    case 'lastHealthChange':
      return entity.lastHealthChange;
    case 'age':
      return entity.age;
    case 'firstSeen':
      return entity.firstSeen;
    case 'lastSeen':
      return entity.lastSeen;
    case 'type':
      return entity.type;
    case 'subType':
      return entity.subType ?? '';
    case 'category':
      return categoryLabel(entity.category);
    case 'provider':
      return entity.provider ? PROVIDER_LABEL[entity.provider] ?? entity.provider : '';
    case CLOUD_ACCOUNT_COLUMN_ID:
      return getCloudAccountDisplayLabel(entity).toLowerCase();
    case 'id':
      return entity.id;
    default:
      break;
  }
  if (K8S_CONTEXT_KEYS.includes(columnId as K8sContextKey)) {
    return getK8sContextValue(entity, columnId as K8sContextKey).toLowerCase();
  }
  if (columnId.startsWith(METRIC_PREFIX)) {
    const metric = findMetric(bucketKey, columnId.slice(METRIC_PREFIX.length));
    if (!metric) return '';
    const statId = inventoryGridStatForMetric(metric);
    const reading = resolveMetricReading(
      entity.name,
      metric,
      statId,
      entity.health,
      alertHintFromEntity(entity.alerts)
    );
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
  /** When set, Alerts badges open the flyout on the Alerts tab. */
  readonly onSelectEntityAlerts?: (entityName: string) => void;
  /** Bumped by the auto-refresh tick so live metric cells re-roll. */
  readonly refreshTick?: number;
  /** When true, renders without the surrounding EuiPanel border. */
  readonly borderless?: boolean;
  /** Page-level density from Display options (not per-grid). */
  readonly density?: ListDensity;
  /**
   * Kubernetes inventory page: filter-for on hierarchy columns (and name on
   * cluster/namespace/node/deployment tables) via page facet dropdowns.
   */
  readonly onK8sCellFilter?: (args: {
    readonly entity: Entity;
    readonly target: K8sCellFilterTarget;
  }) => void;
}

/**
 * Header rendered above the grid — mirrors the classic `SectionHeader` so the
 * ElasticOn grid and the classic list read the same.
 */
const GridSectionHeader = ({
  category,
  subTypeLabel,
  total,
  alertsCount,
  nested,
}: {
  category: EntityCategoryId;
  subTypeLabel?: string;
  total: number;
  alertsCount: number;
  nested?: boolean;
}) => {
  const descriptor = getCategoryDescriptor(category);
  const heading = nested && subTypeLabel ? subTypeLabel : descriptor?.label ?? category;
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h4>{heading}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.translate('xpack.streams.entityCentricLab.entities.datagrid.resourcesLabel', {
                defaultMessage: 'Resources:',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span style={{ borderLeft: '1px solid #D3DAE6', height: 20, display: 'inline-block' }} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.translate(
                'xpack.streams.entityCentricLab.entities.datagrid.resourcesWithAlertsLabel',
                { defaultMessage: 'Resources with alerts:' }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={alertsCount > 0 ? 'danger' : 'hollow'}>
              {alertsCount.toLocaleString()}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/** Column ids hidden in Phase 1 (alerts-first, no health concept). */
const PHASE1_HIDDEN_COLUMN_IDS = new Set(['health', 'lastHealthChange']);

export const EntityDataGridSection = ({
  category,
  subTypeLabel,
  nested,
  rows,
  onSelectEntity,
  onSelectEntityAlerts,
  refreshTick,
  borderless = false,
  density = DEFAULT_LIST_DENSITY,
  onK8sCellFilter,
}: Props) => {
  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const phase = useVariation('phase') as PhaseVariation;
  const isPhase1 = phase === 'phase1';
  const isHomogeneous = useMemo(() => isHomogeneousTypeGroup(category, rows), [category, rows]);
  // Bucket key = entity type identity (Kubernetes groups by sub-type, everyone
  // else by `.type`), matching the hex-map metric catalog so metric columns and
  // the per-type column config line up. Mixed tables use a dedicated key so
  // they don't inherit a Pods/Clusters column layout from the first row.
  const bucketKey = useMemo<BucketKey>(() => {
    if (!isHomogeneous) return `${category}:mixed`;
    const first = rows[0];
    const groupLabel = category === 'kubernetes' ? first?.subType ?? first?.type : first?.type;
    return bucketKeyFor(category, groupLabel);
  }, [category, rows, isHomogeneous]);

  // Type-specific metrics (API latency, replica counts, …) only belong on a
  // homogeneous table. A mixed bag would show signals that are meaningless
  // for most rows.
  const metricColumns = useMemo<CatalogColumn[]>(
    () =>
      isHomogeneous
        ? getBucketMetrics(bucketKey)
            .filter(
              (metric) =>
                metric.id !== ENTITY_HEALTH_METRIC_ID && metric.id !== ENTITY_ALERTS_METRIC_ID
            )
            .map((metric) => ({
              id: `${METRIC_PREFIX}${metric.id}`,
              label: metricColumnHeaderLabel(metric),
              description: metricColumnDescription(metric),
            }))
        : [],
    [bucketKey, isHomogeneous]
  );

  const k8sContext = useMemo(
    () =>
      isHomogeneous
        ? getK8sContextColumnIds(bucketKey)
        : { defaultVisible: [] as const, hidden: [] as const },
    [bucketKey, isHomogeneous]
  );
  const defaultVisibleIds = useMemo(() => {
    const ids = defaultVisibleIdsFor(bucketKey, isHomogeneous);
    return isPhase1 ? ids.filter((id) => !PHASE1_HIDDEN_COLUMN_IDS.has(id)) : ids;
  }, [bucketKey, isHomogeneous, isPhase1]);

  const catalog = useMemo<CatalogColumn[]>(() => {
    const allColumns = [
      ...BASE_VISIBLE_COLUMNS,
      ...k8sContext.defaultVisible.map(k8sContextCatalogColumn),
      ...k8sContext.hidden.map(k8sContextCatalogColumn),
      ...BASE_HIDDEN_COLUMNS,
      ...metricColumns,
    ];
    const filtered = isPhase1
      ? allColumns.filter((col) => !PHASE1_HIDDEN_COLUMN_IDS.has(col.id))
      : allColumns;
    return orderCatalogLikeDefaultTable(filtered, defaultVisibleIds);
  }, [k8sContext, metricColumns, isPhase1, defaultVisibleIds]);
  const catalogIds = useMemo(() => catalog.map((column) => column.id), [catalog]);

  const { visibleColumns, setVisibleColumns, reset } = useColumnConfig(
    bucketKey,
    catalogIds,
    defaultVisibleIds
  );
  const { euiTheme } = useEuiTheme();

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
      sortingColumns.length > 0
        ? sortingColumns
        : [{ id: isPhase1 ? 'alerts' : 'health', direction: 'asc' as const }];
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
  }, [rows, sortingColumns, bucketKey, refreshTick, isPhase1]);

  const gridColumns = useMemo<EuiDataGridColumn[]>(
    () =>
      catalog.map((column) => {
        const columnDef: EuiDataGridColumn = {
          id: column.id,
          displayAsText: column.label,
          display: (
            <ColumnHeaderWithInfo
              columnId={column.id}
              label={column.label}
              description={column.description}
            />
          ),
          isSortable: true,
        };
        if (
          !onK8sCellFilter ||
          category !== 'kubernetes' ||
          !isK8sInventoryFilterColumn(column.id, bucketKey)
        ) {
          return columnDef;
        }
        const columnLabel = k8sFilterColumnLabel(column.id);
        return {
          ...columnDef,
          cellActions: buildInventoryFilterCellActions({
            columnId: column.id,
            columnLabel,
            getRowValue: (rowIndex) => {
              const entity = sortedRows[rowIndex];
              if (!entity) return undefined;
              return resolveK8sCellFilterTarget(column.id, entity, bucketKey)?.value;
            },
            onFilter: (rowIndex) => {
              const entity = sortedRows[rowIndex];
              if (!entity) return;
              const target = resolveK8sCellFilterTarget(column.id, entity, bucketKey);
              if (!target) return;
              onK8sCellFilter({ entity, target });
            },
            dataGridRef,
          }),
        };
      }),
    [catalog, onK8sCellFilter, category, bucketKey, sortedRows, dataGridRef]
  );

  const tableKey = bucketKey ?? category;
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(() => readPageSizeForTable(tableKey));
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
        case 'alerts':
          return (
            <EuiBadge
              color={ALERT_BADGE_COLOR[alertStatusId(entity)] ?? 'hollow'}
              onClick={() => (onSelectEntityAlerts ?? onSelectEntity)(entity.name)}
              onClickAriaLabel={i18n.translate(
                'xpack.streams.entityCentricLab.entities.datagrid.alertsBadge.ariaLabel',
                {
                  defaultMessage: 'Open alerts for {name}',
                  values: { name: entity.name },
                }
              )}
            >
              {alertBadgeLabel(entity)}
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
        case 'firstSeen':
          return entity.firstSeen;
        case 'lastSeen':
          return entity.lastSeen;
        case 'type':
          return entity.type;
        case 'subType':
          return entity.subType ?? '—';
        case 'category':
          return categoryLabel(entity.category);
        case 'provider':
          return entity.provider ? PROVIDER_LABEL[entity.provider] ?? entity.provider : '—';
        case CLOUD_ACCOUNT_COLUMN_ID: {
          const label = getCloudAccountDisplayLabel(entity);
          if (!label) return '—';
          const title = cloudAccountCellTitle(entity);
          return title ? <span title={title}>{label}</span> : label;
        }
        case 'id':
          return entity.id;
        default:
          break;
      }
      if (K8S_CONTEXT_KEYS.includes(columnId as K8sContextKey)) {
        const value = getK8sContextValue(entity, columnId as K8sContextKey);
        return value ? <EuiBadge color="hollow">{value}</EuiBadge> : '—';
      }
      if (columnId.startsWith(METRIC_PREFIX)) {
        const metric = findMetric(bucketKey, columnId.slice(METRIC_PREFIX.length));
        if (!metric) return '—';
        const statId = inventoryGridStatForMetric(metric);
        const reading = resolveMetricReading(
          entity.name,
          metric,
          statId,
          entity.health,
          alertHintFromEntity(entity.alerts)
        );
        if (metric.kind !== 'numeric') return reading.displayValue;
        return (
          <NumericMetricCell
            displayValue={reading.displayValue}
            series={resolveMetricSparkline(entity.name, metric, statId, entity.health)}
            color={euiTheme.colors.primary}
          />
        );
      }
      return null;
    },
    [sortedRows, onSelectEntity, onSelectEntityAlerts, bucketKey, euiTheme]
  );

  const descriptor = getCategoryDescriptor(category);
  const captionLabel = subTypeLabel
    ? `${descriptor?.label ?? category} · ${subTypeLabel}`
    : descriptor?.label ?? category;

  // When nested without a sub-type label the category header is already
  // rendered outside the panel — skip the in-panel duplicate.
  const showInPanelHeader = !nested || Boolean(subTypeLabel);

  const Wrapper = borderless ? React.Fragment : EuiPanel;
  const wrapperProps = borderless
    ? {}
    : { hasBorder: true, hasShadow: false, paddingSize: 's' as const };

  return (
    <Wrapper {...wrapperProps}>
      {showInPanelHeader && (
        <>
          <GridSectionHeader
            category={category}
            subTypeLabel={subTypeLabel}
            total={rows.length}
            alertsCount={rows.filter((e) => e.alerts.active > 0).length}
            nested={nested}
          />
          <EuiSpacer size="xs" />
        </>
      )}
      <EuiDataGrid
        ref={dataGridRef}
        aria-label={i18n.translate('xpack.streams.entityCentricLab.entities.grid.ariaLabel', {
          defaultMessage: '{label} resources',
          values: { label: captionLabel },
        })}
        columns={gridColumns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={sortedRows.length}
        renderCellValue={renderCellValue}
        gridStyle={getListGridStyle(density)}
        sorting={{ columns: sortingColumns, onSort: setSortingColumns }}
        pagination={{
          pageIndex: safePageIndex,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onChangeItemsPerPage: (size) => {
            setPageSize(size);
            setPageIndex(0);
            writePageSizeForTable(tableKey, size);
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
    </Wrapper>
  );
};
