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
  isCustomMetricId,
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

/** Data-grid alerts badge: active count, or "No alert set up". */
export const alertsGridColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.alertsGrid', {
    defaultMessage:
      'Alert rules firing right now. The badge is how many are active. "No alert set up" means this resource has no alert rules.',
  });

/** Classic list badge: "Alerting (active/total)" or N/A. */
export const alertsListColumnDescription = (): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.alertsList', {
    defaultMessage:
      'Alert rules for this resource. The badge shows firing rules over configured rules, such as Alerting (1/3). N/A means no rules are configured.',
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
      'Latest anomaly insight for this resource. "No anomalies detected" means nothing stood out in the selected time range.',
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
    defaultMessage: 'Latest observed value in the selected time range.',
  });

const defaultNumericDescription = (label: string): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.numericDefault', {
    defaultMessage:
      '{label}. The number is the latest value in the selected time range, not an average, minimum, or maximum. The sparkline is this metric over that range, and the rightmost point is the number shown.',
    values: { label },
  });

const customMetricDescription = (label: string): string =>
  i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.customMetric', {
    defaultMessage:
      '{label}. The number is the latest value in the selected time range. The sparkline is this metric over that range, and the rightmost point is the number shown.',
    values: { label },
  });

/**
 * What a metric column cell shows. Numeric cells are the `last` stat
 * (not min / max / average) plus a sparkline of that same series.
 */
export const metricColumnDescription = (metric: MetricDescriptor): string => {
  if (isCustomMetricId(metric.id)) {
    return customMetricDescription(metric.label);
  }
  switch (metric.id) {
    case 'status':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.status', {
        defaultMessage:
          'Latest status in the selected time range: Running, Degraded, Down, or Unknown.',
      });
    case 'phase':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.phase', {
        defaultMessage:
          'Latest pod phase in the selected time range: Running, Succeeded, Pending, Failed, or Unknown.',
      });
    case 'condition':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.condition', {
        defaultMessage:
          'Latest node condition in the selected time range: Ready, Memory pressure, Disk pressure, PID pressure, or Not ready.',
      });
    case 'rollout':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.rollout', {
        defaultMessage:
          'Latest rollout state in the selected time range: Available, Rolling out, Degraded, or Unavailable.',
      });
    case 'instance-state':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.instanceState', {
        defaultMessage:
          'Latest instance state in the selected time range: Running, Pending, Stopping, Stopped, or Terminated.',
      });
    case 'region-status':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.regionStatus', {
        defaultMessage:
          'Latest AWS health status in the selected time range: OK, Service event, or Outage.',
      });
    case 'schedule-status':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.scheduleStatus', {
        defaultMessage:
          'Whether a pod is scheduled on every node: All scheduled, Partial, or None scheduled. This is the latest state in the selected time range.',
      });
    case 'last-status':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.lastStatus', {
        defaultMessage: 'Outcome of the most recent run: Succeeded, Running, Failed, or Suspended.',
      });
    case 'cpu-util':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.cpuUtil', {
        defaultMessage:
          'CPU utilization as a percentage of capacity. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'memory-util':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.memoryUtil', {
        defaultMessage:
          'Memory utilization as a percentage of capacity. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'disk-util':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.diskUtil', {
        defaultMessage:
          'Disk utilization as a percentage of capacity. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'load-1m':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.loadAvg', {
        defaultMessage:
          'One-minute load average. The number is the latest sample in the selected time range. The sparkline is the load average over that range, and the rightmost point is the number shown.',
      });
    case 'error-rate':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.errorRate', {
        defaultMessage:
          'Share of requests that errored, as a percentage. The number is the latest sample in the selected time range, not an average across the whole range. The sparkline is the error rate over that range, and the rightmost point is the number shown.',
      });
    case 'latency-p95':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.latencyP95', {
        defaultMessage:
          'The response time that 95 out of 100 requests stay under, in milliseconds. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'throughput':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.throughput', {
        defaultMessage:
          'Request throughput, in requests per minute. The number is the latest rate in the selected time range. The sparkline is throughput over that range, and the rightmost point is the number shown.',
      });
    case 'connection-saturation':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.columnHelp.connectionSaturation',
        {
          defaultMessage:
            'Open connections as a percentage of the connection limit. The number is the latest sample in the selected time range, not an average. The sparkline is connection saturation over that range, and the rightmost point is the number shown.',
        }
      );
    case 'query-latency':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.queryLatency', {
        defaultMessage:
          'The query time that 95 out of 100 queries stay under, in milliseconds. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'replication-lag':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.replicationLag', {
        defaultMessage:
          'Delay between the primary and its replica, in seconds. The number is the latest sample in the selected time range. The sparkline is replication lag over that range, and the rightmost point is the number shown.',
      });
    case 'quota-util':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.quotaUtil', {
        defaultMessage:
          'Quota used, as a percentage of the limit. The number is the latest sample in the selected time range, not an average. The sparkline is quota utilization over that range, and the rightmost point is the number shown.',
      });
    case 'cost-trend':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.costTrend', {
        defaultMessage:
          'Percent change in cost over the last 7 days. The number is the latest reading of that change. The sparkline is the 7-day cost change across the selected time range, and the rightmost point is the number shown.',
      });
    case 'api-success':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.apiSuccess', {
        defaultMessage:
          'Share of API calls that succeeded, as a percentage. The number is the latest sample in the selected time range. The sparkline is the success rate over that range, and the rightmost point is the number shown.',
      });
    case 'throttle-rate':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.throttleRate', {
        defaultMessage:
          'Share of requests that were throttled, as a percentage. The number is the latest sample in the selected time range. The sparkline is the throttling rate over that range, and the rightmost point is the number shown.',
      });
    case 'spend-mtd':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.spendMtd', {
        defaultMessage:
          'Cloud spend so far this month, in dollars. The number is the latest month-to-date total, not a rate. The sparkline shows how that total moved over the selected time range, and the rightmost point is the number shown.',
      });
    case 'network-out':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.networkOut', {
        defaultMessage:
          'Outbound network throughput, in megabytes per second. The number is the latest rate in the selected time range. The sparkline is network out over that range, and the rightmost point is the number shown.',
      });
    case 'status-checks':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.statusChecks', {
        defaultMessage:
          'Number of failing instance status checks. The number is the latest count in the selected time range. The sparkline is that count over the range, and the rightmost point is the number shown.',
      });
    case 'invocations':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.invocations', {
        defaultMessage:
          'Function invocations per minute. The number is the latest rate in the selected time range. The sparkline is the invocation rate over that range, and the rightmost point is the number shown.',
      });
    case 'p99-duration':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.p99Duration', {
        defaultMessage:
          'The run time that 99 out of 100 function runs stay under, in milliseconds. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'cold-starts':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.coldStarts', {
        defaultMessage:
          'Share of invocations that were cold starts, as a percentage. The number is the latest sample in the selected time range. The sparkline is the cold-start rate over that range, and the rightmost point is the number shown.',
      });
    case 'throttles':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.throttles', {
        defaultMessage:
          'Number of throttled invocations. The number is the latest count in the selected time range. The sparkline is that count over the range, and the rightmost point is the number shown.',
      });
    case 'concurrent-executions':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.columnHelp.concurrentExecutions',
        {
          defaultMessage:
            'Executions running at the same time. The number is the latest count in the selected time range. The sparkline is concurrent executions over that range, and the rightmost point is the number shown.',
        }
      );
    case 'provisioned-concurrency-util':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.columnHelp.provisionedConcurrencyUtil',
        {
          defaultMessage:
            'Provisioned concurrency in use, as a percentage of the concurrency configured. The number is the latest sample in the selected time range, not an average. The sparkline is that utilization over the range, and the rightmost point is the number shown.',
        }
      );
    case 'request-rate':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.requestRate', {
        defaultMessage:
          'Requests per second. The number is the latest rate in the selected time range. The sparkline is the request rate over that range, and the rightmost point is the number shown.',
      });
    case 's3-4xx':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.s3Errors4xx', {
        defaultMessage:
          'Share of requests that returned a 4xx status, as a percentage. The number is the latest sample in the selected time range. The sparkline is the 4xx ratio over that range, and the rightmost point is the number shown.',
      });
    case 's3-5xx':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.s3Errors5xx', {
        defaultMessage:
          'Share of requests that returned a 5xx status, as a percentage. The number is the latest sample in the selected time range. The sparkline is the 5xx ratio over that range, and the rightmost point is the number shown.',
      });
    case 'first-byte':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.firstByte', {
        defaultMessage:
          'Time until the first byte of the response, in milliseconds. The number is the latest sample in the selected time range. The sparkline is first-byte latency over that range, and the rightmost point is the number shown.',
      });
    case 'bucket-size':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.bucketSize', {
        defaultMessage:
          'Amount of data stored, in gigabytes. The number is the latest size, not a rate. The sparkline shows how the size changed over the selected time range, and the rightmost point is the number shown.',
      });
    case 'object-count':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.objectCount', {
        defaultMessage:
          'Number of stored objects, in thousands. The number is the latest count. The sparkline shows how the count changed over the selected time range, and the rightmost point is the number shown.',
      });
    case 'get-put-ratio':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.getPutRatio', {
        defaultMessage:
          'GET requests divided by PUT requests. The number is the latest ratio in the selected time range. The sparkline is that ratio over the range, and the rightmost point is the number shown.',
      });
    case 'active-connections':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.columnHelp.activeConnections',
        {
          defaultMessage:
            'Connections open right now. The number is the latest count in the selected time range. The sparkline is active connections over that range, and the rightmost point is the number shown.',
        }
      );
    case 'queue-depth':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.queueDepth', {
        defaultMessage:
          'Messages waiting to be consumed. The number is the latest count in the selected time range. The sparkline is queue depth over that range, and the rightmost point is the number shown.',
      });
    case 'consumer-lag':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.consumerLag', {
        defaultMessage:
          'How far consumers are behind the latest message, in seconds. The number is the latest lag in the selected time range. The sparkline is consumer lag over that range, and the rightmost point is the number shown.',
      });
    case 'token-spend':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.tokenSpend', {
        defaultMessage:
          'Model spend over the last hour, in dollars. The number is the latest one-hour total. The sparkline is that hourly spend across the selected time range, and the rightmost point is the number shown.',
      });
    case 'api-latency':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.apiLatency', {
        defaultMessage:
          'API server response time, in milliseconds. The number is the latest sample in the selected time range, not an average. The sparkline is API server latency over that range, and the rightmost point is the number shown.',
      });
    case 'node-count':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.nodeCount', {
        defaultMessage:
          'Nodes in this cluster. The number is the latest count in the selected time range. The sparkline is the node count over that range, and the rightmost point is the number shown.',
      });
    case 'pod-count':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.podCount', {
        defaultMessage:
          'Pods on this node. The number is the latest count in the selected time range. The sparkline is the pod count over that range, and the rightmost point is the number shown.',
      });
    case 'cpu-usage':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.cpuUsage', {
        defaultMessage:
          'CPU utilization as a percentage. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'memory-usage':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.memoryUsage', {
        defaultMessage:
          'Memory utilization as a percentage. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'restarts':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.restarts', {
        defaultMessage:
          'Restarts in the last hour. The number is the latest count for that one-hour window, not a lifetime total. The sparkline shows how that hourly count changed over the selected time range, and the rightmost point is the number shown.',
      });
    case 'cpu-limit-util':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.cpuLimitUtil', {
        defaultMessage:
          'CPU utilization as a percentage of the CPU limit. It can exceed 100% when utilization is above the limit. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'memory-limit-util':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.memoryLimitUtil', {
        defaultMessage:
          'Memory utilization as a percentage of the memory limit. It can exceed 100% when utilization is above the limit. Shows the latest value in the selected time range, with the trend charted over that range.',
      });
    case 'available-replicas':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.columnHelp.availableReplicas',
        {
          defaultMessage:
            'Available replicas as a percentage of the desired count. The number is the latest percentage in the selected time range. The sparkline is available replicas over that range, and the rightmost point is the number shown.',
        }
      );
    case 'ready-replicas':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.readyReplicas', {
        defaultMessage:
          'Ready replicas as a percentage of the desired count. The number is the latest percentage in the selected time range. The sparkline is ready replicas over that range, and the rightmost point is the number shown.',
      });
    case 'replica-count':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.replicaCount', {
        defaultMessage:
          'Current number of replicas. The number is the latest count in the selected time range. The sparkline is the replica count over that range, and the rightmost point is the number shown.',
      });
    case 'volume-util':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.volumeUtil', {
        defaultMessage:
          'Persistent volume used, as a percentage of capacity. The number is the latest sample in the selected time range, not an average. The sparkline is volume utilization over that range, and the rightmost point is the number shown.',
      });
    case 'available-pct':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.availablePct', {
        defaultMessage:
          'DaemonSet pods available, as a percentage of the desired count. The number is the latest percentage in the selected time range. The sparkline is availability over that range, and the rightmost point is the number shown.',
      });
    case 'misscheduled':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.misscheduled', {
        defaultMessage:
          'Pods running on nodes they are not supposed to run on. The number is the latest count in the selected time range. The sparkline is the misscheduled count over that range, and the rightmost point is the number shown.',
      });
    case 'failures-24h':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.failures24h', {
        defaultMessage:
          'Failed runs in the last 24 hours. The number is the latest count for that window, not a lifetime total. The sparkline shows how that 24-hour count changed over the selected time range, and the rightmost point is the number shown.',
      });
    case 'avg-duration':
      return i18n.translate('xpack.streams.entityCentricLab.entities.columnHelp.avgDuration', {
        defaultMessage:
          'Average duration of recent runs, in seconds. The number is the latest average, not a single run. The sparkline is that average over the selected time range, and the rightmost point is the number shown.',
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

export const hexMapLegendMetricLabel = (metric: MetricDescriptor, statId: StatId): string => {
  if (metric.kind !== 'numeric') {
    return metric.label;
  }
  const effectiveStat = effectiveStatForMetric(metric, statId);
  return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.metricLabelWithStat', {
    defaultMessage: '{metricLabel} ({statLabel})',
    values: {
      metricLabel: metric.label,
      statLabel: hexMapLegendStatLabel(effectiveStat),
    },
  });
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
        defaultMessage: 'the latest value in the selected time range',
      });
  }
};

/** Short "what is this metric" for hex-map legend tips (no sparkline wording). */
const hexMapMetricConcept = (metric: MetricDescriptor): string => {
  if (metric.id === ENTITY_ALERTS_METRIC_ID) {
    return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.alerts', {
      defaultMessage:
        'Whether alert rules are firing on each resource right now. Red means active alerts; green means none; grey means no alert rules are set up.',
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
        defaultMessage: 'Latest status of each resource: Running, Degraded, Down, or Unknown.',
      });
    case 'condition':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.hexMapLegend.concept.condition',
        {
          defaultMessage:
            'Latest node condition: Ready, Memory pressure, Disk pressure, PID pressure, or Not ready.',
        }
      );
    case 'phase':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.phase', {
        defaultMessage:
          'Latest pod phase: Running, Succeeded, Pending, Failed, or Unknown.',
      });
    case 'rollout':
      return i18n.translate('xpack.streams.entityCentricLab.entities.hexMapLegend.concept.rollout', {
        defaultMessage:
          'Latest rollout state: Available, Rolling out, Degraded, or Unavailable.',
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
              defaultMessage: 'Latest observed category for each resource in the selected time range.',
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
