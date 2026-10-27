/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Info icons for list-table headers whose label does not say what the cell
 * actually is: which aggregation, which window, and what the sparkline plots.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ENTITY_ALERTS_METRIC_ID,
  ENTITY_HEALTH_METRIC_ID,
  effectiveStatForMetric,
  getStatLabel,
  inventoryGridStatForMetric,
  isCustomMetricId,
  METRIC_COLUMN_OMIT_STAT_SUFFIX,
  METRIC_LAST_STAT_ONLY,
  type MetricDescriptor,
  type StatId,
} from './bucket_metrics';

const stopHeaderClick = (event: React.MouseEvent) => {
  event.stopPropagation();
};

export const ColumnHeaderWithInfo = ({
  label,
  description,
  columnId,
}: {
  label: string;
  description?: string;
  columnId: string;
}) => {
  if (!description) {
    return <>{label}</>;
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <EuiIconTip
        type="info"
        size="s"
        color="subdued"
        position="bottom"
        repositionOnScroll
        content={description}
        aria-label={i18n.translate(
          'xpack.streams.entityCentricLab.entities.columnHelp.iconAriaLabel',
          {
            defaultMessage: 'About {column}',
            values: { column: label },
          }
        )}
        anchorProps={{
          onClick: stopHeaderClick,
          onMouseDown: stopHeaderClick,
          style: { display: 'inline-flex', flexShrink: 0 },
          'data-test-subj': `entityCentricLabColumnInfo-${columnId}`,
        }}
      />
    </span>
  );
};

export const healthColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.health', {
    defaultMessage: 'Overall health of this resource: Healthy, At risk, or Unhealthy.',
  });

/** Data-grid alerts badge: active count, "0 active alerts", or "No alert set up". */
export const alertsGridColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.alertsGrid', {
    defaultMessage:
      'Active alerts on this resource. Grey means no alert rules are set up.',
  });

/** Classic list badge: "Alerting (active/total)", OK, or N/A. */
export const alertsListColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.alertsList', {
    defaultMessage:
      'Alert rules on this resource. Red shows firing rules (active/total). Green means none firing. Grey (N/A) means no rules are configured.',
  });

export const lastHealthChangeColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.lastHealthChange', {
    defaultMessage: 'When this resource last moved between Healthy, At risk, and Unhealthy.',
  });

export const uptimeColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.uptime', {
    defaultMessage: 'How long this resource has been running.',
  });

export const anomalyDetectionColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.anomalyDetection', {
    defaultMessage:
      'Anomaly insight for this resource. "No anomalies detected" means nothing stood out. Last value in the selected time range.',
  });

export const firstSeenColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.firstSeen', {
    defaultMessage: 'When this resource was first observed.',
  });

export const lastSeenColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.lastSeen', {
    defaultMessage: 'When this resource was last observed.',
  });

const defaultCategoricalDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.categoricalDefault', {
    defaultMessage: 'Last value in the selected time range.',
  });

/** Categorical metric cells: enum or state at the end of the range. */
const categoricalLastValueDescription = (definition: string): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.categoricalLastValue', {
    defaultMessage: '{definition}. Last value in the selected time range.',
    values: { definition },
  });

/** Numeric metric cells: `last` stat plus a sparkline of the same series. */
const numericSparklineColumnDescription = (
  definition: string,
  { notAggregate = false }: { notAggregate?: boolean } = {}
): string => {
  if (notAggregate) {
    return i18n.translate(
      'xpack.streams.entityCentricLab.entities.columnHelp.numericWithSparkline.notAggregate',
      {
        defaultMessage:
          '{definition}. The number is the last value in the selected time range, not an average, minimum, or maximum. The sparkline charts this metric over that range; the rightmost point is the number shown.',
        values: { definition },
      }
    );
  }
  return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.numericWithSparkline', {
    defaultMessage:
      '{definition}. The number is the last value in the selected time range. The sparkline charts this metric over that range; the rightmost point is the number shown.',
    values: { definition },
  });
};

const defaultNumericDescription = (label: string): string =>
  numericSparklineColumnDescription(label, { notAggregate: true });

const customMetricDescription = (label: string): string => numericSparklineColumnDescription(label);

/**
 * What a metric column cell shows. Numeric cells are the `last` stat
 * (not min / max / average) plus a sparkline of that same series.
 */
export const alertsMetricColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.alertsMetric', {
    defaultMessage:
      'Active alerts on this resource. Red means active alerts; green means none; grey means no alert rules are set up.',
  });

export const metricColumnDescription = (metric: MetricDescriptor): string => {
  if (isCustomMetricId(metric.id)) {
    return customMetricDescription(metric.label);
  }
  if (metric.id === ENTITY_ALERTS_METRIC_ID) {
    return alertsMetricColumnDescription();
  }
  switch (metric.id) {
    case 'status':
      return categoricalLastValueDescription(
        'Status: Running, Degraded, Down, or Unknown'
      );
    case 'phase':
      return categoricalLastValueDescription(
        'Pod phase: Running, Succeeded, Pending, Failed, or Unknown'
      );
    case 'condition':
      return categoricalLastValueDescription(
        'Node condition: Ready, Memory pressure, Disk pressure, PID pressure, or Not ready'
      );
    case 'rollout':
      return categoricalLastValueDescription(
        'Rollout state: Available, Rolling out, Degraded, or Unavailable'
      );
    case 'instance-state':
      return categoricalLastValueDescription(
        'Instance state: Running, Pending, Stopping, Stopped, or Terminated'
      );
    case 'region-status':
      return categoricalLastValueDescription(
        'AWS health status: OK, Service event, or Outage'
      );
    case 'schedule-status':
      return categoricalLastValueDescription(
        'Pod scheduling on nodes: All scheduled, Partial, or None scheduled'
      );
    case 'last-status':
      return categoricalLastValueDescription(
        'Most recent run outcome: Succeeded, Running, Failed, or Suspended'
      );
    case 'cpu-util':
      return numericSparklineColumnDescription(
        'CPU utilization as a percentage of capacity'
      );
    case 'memory-util':
      return numericSparklineColumnDescription(
        'Memory utilization as a percentage of capacity'
      );
    case 'disk-util':
      return numericSparklineColumnDescription(
        'Disk utilization as a percentage of capacity'
      );
    case 'load-1m':
      return numericSparklineColumnDescription('One-minute load average');
    case 'error-rate':
      return numericSparklineColumnDescription(
        'Share of requests that errored, as a percentage',
        { notAggregate: true }
      );
    case 'latency-p95':
      return numericSparklineColumnDescription(
        'Response time that 95 out of 100 requests stay under, in milliseconds'
      );
    case 'throughput':
      return numericSparklineColumnDescription(
        'Request throughput, in requests per minute'
      );
    case 'connection-saturation':
      return numericSparklineColumnDescription(
        'Open connections as a percentage of the connection limit',
        { notAggregate: true }
      );
    case 'query-latency':
      return numericSparklineColumnDescription(
        'Query time that 95 out of 100 queries stay under, in milliseconds'
      );
    case 'replication-lag':
      return numericSparklineColumnDescription(
        'Delay between the primary and its replica, in seconds'
      );
    case 'quota-util':
      return numericSparklineColumnDescription(
        'Quota used, as a percentage of the limit',
        { notAggregate: true }
      );
    case 'cost-trend':
      return numericSparklineColumnDescription(
        'Percent change in cost over the last 7 days'
      );
    case 'api-success':
      return numericSparklineColumnDescription(
        'Share of API calls that succeeded, as a percentage'
      );
    case 'throttle-rate':
      return numericSparklineColumnDescription(
        'Share of requests that were throttled, as a percentage'
      );
    case 'spend-mtd':
      return numericSparklineColumnDescription(
        'Cloud spend so far this month, in dollars (month-to-date total, not a rate)'
      );
    case 'network-out':
      return numericSparklineColumnDescription(
        'Outbound network throughput, in megabytes per second'
      );
    case 'status-checks':
      return numericSparklineColumnDescription(
        'Number of failing instance status checks'
      );
    case 'invocations':
      return numericSparklineColumnDescription(
        'Function invocations per minute'
      );
    case 'p99-duration':
      return numericSparklineColumnDescription(
        'Run time that 99 out of 100 function runs stay under, in milliseconds'
      );
    case 'cold-starts':
      return numericSparklineColumnDescription(
        'Share of invocations that were cold starts, as a percentage'
      );
    case 'throttles':
      return numericSparklineColumnDescription('Number of throttled invocations');
    case 'concurrent-executions':
      return numericSparklineColumnDescription('Executions running at the same time');
    case 'provisioned-concurrency-util':
      return numericSparklineColumnDescription(
        'Provisioned concurrency in use, as a percentage of the concurrency configured',
        { notAggregate: true }
      );
    case 'request-rate':
      return numericSparklineColumnDescription('Requests per second');
    case 's3-4xx':
      return numericSparklineColumnDescription(
        'Share of requests that returned a 4xx status, as a percentage'
      );
    case 's3-5xx':
      return numericSparklineColumnDescription(
        'Share of requests that returned a 5xx status, as a percentage'
      );
    case 'first-byte':
      return numericSparklineColumnDescription(
        'Time until the first byte of the response, in milliseconds'
      );
    case 'bucket-size':
      return numericSparklineColumnDescription(
        'Amount of data stored, in gigabytes (stored size, not a rate)'
      );
    case 'object-count':
      return numericSparklineColumnDescription(
        'Number of stored objects, in thousands'
      );
    case 'get-put-ratio':
      return numericSparklineColumnDescription('GET requests divided by PUT requests');
    case 'active-connections':
      return numericSparklineColumnDescription('Connections open right now');
    case 'queue-depth':
      return numericSparklineColumnDescription('Messages waiting to be consumed');
    case 'consumer-lag':
      return numericSparklineColumnDescription(
        'How far consumers are behind the latest message, in seconds'
      );
    case 'token-spend':
      return numericSparklineColumnDescription(
        'Model spend over the last hour, in dollars (rolling one-hour total)'
      );
    case 'api-latency':
      return numericSparklineColumnDescription(
        'API server response time, in milliseconds',
        { notAggregate: true }
      );
    case 'node-count':
      return numericSparklineColumnDescription('Nodes in this cluster');
    case 'pod-count':
      return numericSparklineColumnDescription('Pods on this node');
    case 'cpu-usage':
      return numericSparklineColumnDescription('CPU utilization as a percentage');
    case 'memory-usage':
      return numericSparklineColumnDescription('Memory utilization as a percentage');
    case 'restarts':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.restarts', {
        defaultMessage:
          'Restarts in the rolling last hour (window total, not a lifetime counter). The number is the last reading of that 1-hour count in the selected time range, not the sum across the whole range. The sparkline charts this metric over that range; the rightmost point is the number shown.',
      });
    case 'cpu-limit-util':
      return numericSparklineColumnDescription(
        'CPU utilization as a percentage of the CPU limit (can exceed 100% when above the limit)'
      );
    case 'memory-limit-util':
      return numericSparklineColumnDescription(
        'Memory utilization as a percentage of the memory limit (can exceed 100% when above the limit)'
      );
    case 'available-replicas':
      return numericSparklineColumnDescription(
        'Available replicas as a percentage of the desired count'
      );
    case 'ready-replicas':
      return numericSparklineColumnDescription(
        'Ready replicas as a percentage of the desired count'
      );
    case 'replica-count':
      return numericSparklineColumnDescription('Current number of replicas');
    case 'volume-util':
      return numericSparklineColumnDescription(
        'Persistent volume used, as a percentage of capacity',
        { notAggregate: true }
      );
    case 'available-pct':
      return numericSparklineColumnDescription(
        'DaemonSet pods available, as a percentage of the desired count'
      );
    case 'misscheduled':
      return numericSparklineColumnDescription(
        'Pods running on nodes they are not supposed to run on'
      );
    case 'failures-24h':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.failures24h', {
        defaultMessage:
          'Failed runs in the rolling last 24 hours (window total). The number is the last reading of that 24-hour count in the selected time range, not the sum across the whole range. The sparkline charts this metric over that range; the rightmost point is the number shown.',
      });
    case 'avg-duration':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.avgDuration', {
        defaultMessage:
          'Average duration of recent runs, in seconds. The number is the average value in the selected time range, not a single run. The sparkline charts this metric over that range; the rightmost point is the number shown.',
      });
    default:
      return metric.kind === 'categorical'
        ? defaultCategoricalDescription()
        : defaultNumericDescription(metric.label);
  }
};

/**
 * Legend label for the hex-map Color-by row. Numeric metrics include the
 * selected stat in parentheses ("CPU utilization (Avg)"); categorical
 * metrics stay as-is ("Alerts") because min / max / average are not
 * meaningful for enums.
 */
/** Compact stat label for legend parentheses (Avg vs dropdown "Average"). */
const hexMapLegendStatLabel = (statId: StatId): string => {
  if (statId === 'avg') {
    return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.stat.avgShort', {
      defaultMessage: 'Avg',
    });
  }
  return getStatLabel(statId);
};

const metricLabelWithStatSuffix = (
  metric: MetricDescriptor,
  statId: StatId
): string => {
  const effectiveStat = effectiveStatForMetric(metric, statId);
  return i18n.translate(
    'xpack.streams.entityCentricLab.entities.columnHelp.metricLabelWithStat',
    {
      defaultMessage: '{metricLabel} ({statLabel})',
      values: {
        metricLabel: metric.label,
        statLabel: hexMapLegendStatLabel(effectiveStat),
      },
    }
  );
};

/** List inventory metric column title (fixed stat per metric). */
const omitStatSuffixInColumnHeader = (metric: MetricDescriptor): boolean =>
  metric.kind !== 'numeric' ||
  METRIC_COLUMN_OMIT_STAT_SUFFIX.has(metric.id) ||
  METRIC_LAST_STAT_ONLY.has(metric.id);

export const metricColumnHeaderLabel = (metric: MetricDescriptor): string => {
  if (omitStatSuffixInColumnHeader(metric)) {
    return metric.label;
  }
  return metricLabelWithStatSuffix(metric, inventoryGridStatForMetric(metric));
};

/** Hex map Color-by legend (honors the user's stat picker). */
export const hexMapLegendMetricLabel = (metric: MetricDescriptor, statId: StatId): string => {
  if (omitStatSuffixInColumnHeader(metric)) {
    return metric.label;
  }
  return metricLabelWithStatSuffix(metric, statId);
};

const hexMapStatPhrase = (statId: StatId): string => {
  switch (statId) {
    case 'min':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.statPhrase.min', {
        defaultMessage: 'the minimum value over the selected time range',
      });
    case 'max':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.statPhrase.max', {
        defaultMessage: 'the maximum value over the selected time range',
      });
    case 'avg':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.statPhrase.avg', {
        defaultMessage: 'the average value over the selected time range',
      });
    case 'p95':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.statPhrase.p95', {
        defaultMessage: 'the 95th percentile (P95) over the selected time range',
      });
    case 'p99':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.statPhrase.p99', {
        defaultMessage: 'the 99th percentile (P99) over the selected time range',
      });
    case 'last':
    default:
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.statPhrase.last', {
        defaultMessage: 'the last value in the selected time range',
      });
  }
};

/** Short "what is this metric" for hex-map legend tips (no sparkline wording). */
const hexMapMetricConcept = (metric: MetricDescriptor): string => {
  if (metric.id === ENTITY_ALERTS_METRIC_ID) {
    return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.alerts', {
      defaultMessage:
        'Active alerts on each resource. Red means active alerts; green means none; grey means no alert rules are set up.',
    });
  }
  if (metric.id === ENTITY_HEALTH_METRIC_ID) {
    return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.health', {
      defaultMessage: 'Overall health of each resource: Healthy, At risk, or Unhealthy.',
    });
  }
  switch (metric.id) {
    case 'status':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.status', {
        defaultMessage:
          'Status of each resource: Running, Degraded, Down, or Unknown. Last value in the selected time range.',
      });
    case 'condition':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.hexMapLegend.concept.condition',
        {
          defaultMessage:
            'Node condition of each resource: Ready, Memory pressure, Disk pressure, PID pressure, or Not ready. Last value in the selected time range.',
        }
      );
    case 'phase':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.phase', {
        defaultMessage:
          'Pod phase of each resource: Running, Succeeded, Pending, Failed, or Unknown. Last value in the selected time range.',
      });
    case 'rollout':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.rollout', {
        defaultMessage:
          'Rollout state of each resource: Available, Rolling out, Degraded, or Unavailable. Last value in the selected time range.',
      });
    case 'cpu-util':
    case 'cpu-usage':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.cpuUtil', {
        defaultMessage: 'CPU utilization as a percentage of capacity.',
      });
    case 'memory-util':
    case 'memory-usage':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.hexMapLegend.concept.memoryUtil',
        {
          defaultMessage: 'Memory utilization as a percentage of capacity.',
        }
      );
    case 'disk-util':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.diskUtil', {
        defaultMessage: 'Disk utilization as a percentage of capacity.',
      });
    case 'load-1m':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.loadAvg', {
        defaultMessage: 'One-minute load average.',
      });
    case 'error-rate':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.hexMapLegend.concept.errorRate',
        {
          defaultMessage: 'Share of requests that errored, as a percentage.',
        }
      );
    case 'latency-p95':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.hexMapLegend.concept.latencyP95',
        {
          defaultMessage:
            'The response time that 95 out of 100 requests stay under, in milliseconds.',
        }
      );
    case 'throughput':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.hexMapLegend.concept.throughput',
        {
          defaultMessage: 'Request throughput, in requests per minute.',
        }
      );
    default:
      return metric.kind === 'categorical'
        ? i18n.translate(
            'xpack.streams.entityCentricLab.entities.hexMapLegend.concept.categoricalDefault',
            {
              defaultMessage: 'Last value in the selected time range for each resource.',
            }
          )
        : i18n.translate(
            'xpack.streams.entityCentricLab.entities.hexMapLegend.concept.numericDefault',
            {
              defaultMessage: '{label}.',
              values: { label: metric.label },
            }
          );
  }
};

/**
 * Plain-English tip next to the hex-map Color-by legend label. Mentions
 * which aggregation colors the tiles when the metric is numeric.
 */
export const hexMapLegendDescription = (metric: MetricDescriptor, statId: StatId): string => {
  const concept = hexMapMetricConcept(metric);
  if (metric.kind !== 'numeric') {
    return concept;
  }
  const effectiveStat = effectiveStatForMetric(metric, statId);
  return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.descriptionNumeric', {
    defaultMessage: '{concept} Each tile is colored by {statPhrase}.',
    values: {
      concept,
      statPhrase: hexMapStatPhrase(effectiveStat),
    },
  });
};
