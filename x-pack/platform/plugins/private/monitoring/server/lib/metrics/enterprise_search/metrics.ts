/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EnterpriseSearchMetric } from './classes';
import { LARGE_BYTES, SMALL_FLOAT, LARGE_FLOAT } from '../../../../common/formatting';

const perSecondUnitLabel = i18n.translate('xpack.monitoring.metrics.entSearch.perSecondUnitLabel', {
  defaultMessage: '/s',
});

const msTimeUnitLabel = i18n.translate('xpack.monitoring.metrics.entSearch.msTimeUnitLabel', {
  defaultMessage: 'ms',
});

export const metrics = {
  app_search_total_engines: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.product_usage.app_search.total_engines',
    metricAgg: 'avg',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.app_search_engines', {
      defaultMessage: 'App Search Engines',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.app_search_engines.description',
      {
        defaultMessage:
          'Current number of App Search engines within the Enterprise Search deployment.',
      }
    ),
    format: SMALL_FLOAT,
    units: '',
  }),

  workplace_search_total_org_sources: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.product_usage.workplace_search.total_org_sources',
    metricAgg: 'avg',
    title: i18n.translate('xpack.monitoring.metrics.entSearch.workplace_search_content_sources', {
      defaultMessage: 'Workpace Search Content Sources',
    }),
    label: i18n.translate('xpack.monitoring.metrics.entSearch.workplace_search_org_sources', {
      defaultMessage: 'Org Sources',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.workplace_search_org_sources.description',
      {
        defaultMessage:
          'Current number of Workplace Search org-wide content sources within the Enterprise Search deployment.',
      }
    ),
    format: SMALL_FLOAT,
    units: '',
  }),

  workplace_search_total_private_sources: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.product_usage.workplace_search.total_private_sources',
    metricAgg: 'avg',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.workplace_search_private_sources', {
      defaultMessage: 'Private Sources',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.workplace_search_private_sources.description',
      {
        defaultMessage:
          'Current number of Workplace Search private content sources within the Enterprise Search deployment.',
      }
    ),
    format: SMALL_FLOAT,
    units: '',
  }),

  enterprise_search_heap_total: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.memory_usage.heap_max.bytes',
    metricAgg: 'max',
    title: i18n.translate('xpack.monitoring.metrics.entSearch.jvm_heap_usage', {
      defaultMessage: 'JVM Heap Usage',
    }),
    label: i18n.translate('xpack.monitoring.metrics.entSearch.heap_total', {
      defaultMessage: 'Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.enterpriseSearch.heap_total.description',
      {
        defaultMessage: 'Maximum amount of JVM heap memory available to the application.',
      }
    ),
    format: LARGE_BYTES,
    units: 'bytes',
  }),

  enterprise_search_heap_committed: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.memory_usage.heap_committed.bytes',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.heap_committed', {
      defaultMessage: 'Committed',
    }),
    description: i18n.translate('xpack.monitoring.metrics.entSearch.heap_committed.description', {
      defaultMessage:
        'The amount of memory JVM has allocated from the OS and is available to the application.',
    }),
    format: LARGE_BYTES,
    units: 'bytes',
  }),

  enterprise_search_heap_used: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.memory_usage.heap_used.bytes',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.heap_used', {
      defaultMessage: 'Used',
    }),
    description: i18n.translate('xpack.monitoring.metrics.entSearch.heap_used.description', {
      defaultMessage: 'Current amount of JVM Heam memory used by the application.',
    }),
    format: LARGE_BYTES,
    units: 'bytes',
  }),

  enterprise_search_gc_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.gc.collection_count',
    derivative: true,
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.gc_rate', {
      defaultMessage: 'JVM GC Rate',
    }),
    description: i18n.translate('xpack.monitoring.metrics.entSearch.gc_rate.description', {
      defaultMessage: 'The rate of JVM garbage collector invocations across the fleet.',
    }),
    format: SMALL_FLOAT,
    units: perSecondUnitLabel,
  }),

  enterprise_search_gc_time: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.gc.collection_time.ms',
    derivative: true,
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.gc_time', {
      defaultMessage: 'Time spent on JVM garbage collection',
    }),
    description: i18n.translate('xpack.monitoring.metrics.entSearch.gc_time.description', {
      defaultMessage: 'Time spent performing JVM garbage collections.',
    }),
    format: LARGE_FLOAT,
    units: msTimeUnitLabel,
  }),

  enterprise_search_threads_current: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.threads.current',
    metricAgg: 'max',
    title: i18n.translate('xpack.monitoring.metrics.entSearch.threads', {
      defaultMessage: 'JVM Threads',
    }),
    label: i18n.translate('xpack.monitoring.metrics.entSearch.threads.current', {
      defaultMessage: 'Active Threads',
    }),
    description: i18n.translate('xpack.monitoring.metrics.entSearch.threads.current.description', {
      defaultMessage: 'Currently running JVM threads used by the application.',
    }),
    format: SMALL_FLOAT,
    units: '',
  }),

  enterprise_search_daemon_threads_current: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.threads.daemon',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.threads.daemon', {
      defaultMessage: 'Daemon Threads',
    }),
    description: i18n.translate('xpack.monitoring.metrics.entSearch.threads.daemon.description', {
      defaultMessage: 'Currently running JVM daemon threads used by the application.',
    }),
    format: SMALL_FLOAT,
    units: '',
  }),

  enterprise_search_jvm_finalizer_queue: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.memory_usage.object_pending_finalization_count',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.finalizer_objects', {
      defaultMessage: 'JVM Objects Pending Finalization',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.finalizer_objects.description',
      {
        defaultMessage: 'Number of objects within the JVM heap waiting for the finalizer thread.',
      }
    ),
    format: SMALL_FLOAT,
    units: '',
  }),

  enterprise_search_threads_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.threads.total_started',
    metricAgg: 'max',
    derivative: true,
    label: i18n.translate('xpack.monitoring.metrics.entSearch.threads.rate', {
      defaultMessage: 'Thread Creation Rate',
    }),
    description: i18n.translate('xpack.monitoring.metrics.entSearch.threads.rate.description', {
      defaultMessage: 'Currently running JVM threads used by the application.',
    }),
    format: SMALL_FLOAT,
    units: perSecondUnitLabel,
  }),

  crawler_workers_total: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.crawler.workers.pool_size',
    metricAgg: 'max',
    title: i18n.translate('xpack.monitoring.metrics.entSearch.crawler_workers', {
      defaultMessage: 'Crawler Workers',
    }),
    label: i18n.translate('xpack.monitoring.metrics.entSearch.total_crawler_workers', {
      defaultMessage: 'Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.total_crawler_workers.description',
      {
        defaultMessage:
          'The number of crawler workers configured across all instances of App Search.',
      }
    ),
    format: SMALL_FLOAT,
    units: '',
  }),

  crawler_workers_active: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.crawler.workers.active',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.active_crawler_workers', {
      defaultMessage: 'Active',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.active_crawler_workers.description',
      {
        defaultMessage: 'Currently active App Search crawler workers.',
      }
    ),
    format: SMALL_FLOAT,
    units: '',
  }),

  enterprise_search_http_connections_current: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.connections.current',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.http_connections.current', {
      defaultMessage: 'Open HTTP Connections',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.http_connections.current.description',
      {
        defaultMessage: 'Currently open incoming HTTP connections across all instances.',
      }
    ),
    format: SMALL_FLOAT,
    units: '',
  }),

  enterprise_search_http_connections_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.connections.total',
    metricAgg: 'max',
    derivative: true,
    label: i18n.translate('xpack.monitoring.metrics.entSearch.http_connections.rate', {
      defaultMessage: 'HTTP Connections Rate',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.current_http_connections.description',
      {
        defaultMessage: 'The rate of incoming HTTP connections across all instances.',
      }
    ),
    format: LARGE_FLOAT,
    units: perSecondUnitLabel,
  }),

  enterprise_search_http_bytes_received_total: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.network.received.bytes',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.http_bytes_received.total', {
      defaultMessage: 'HTTP Bytes Received',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.http_bytes_received.total.description',
      {
        defaultMessage: 'Total number of bytes received by all instances in the deployment.',
      }
    ),
    format: LARGE_BYTES,
    units: 'bytes',
  }),

  enterprise_search_http_bytes_received_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.network.received.bytes',
    metricAgg: 'max',
    derivative: true,
    title: i18n.translate('xpack.monitoring.metrics.entSearch.http_traffic', {
      defaultMessage: 'HTTP Traffic',
    }),
    label: i18n.translate('xpack.monitoring.metrics.entSearch.http_bytes_received.rate', {
      defaultMessage: 'Received',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.http_bytes_received.rate.description',
      {
        defaultMessage: 'Incoming HTTP traffic rate across all instances in the deployment.',
      }
    ),
    format: LARGE_BYTES,
    units: perSecondUnitLabel,
  }),

  enterprise_search_http_bytes_sent_total: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.network.sent.bytes',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.http_bytes_sent.total', {
      defaultMessage: 'HTTP Bytes Sent',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.http_bytes_sent.total.description',
      {
        defaultMessage: 'Total number of bytes sent by all instances in the deployment.',
      }
    ),
    format: LARGE_BYTES,
    units: 'bytes',
  }),

  enterprise_search_http_bytes_sent_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.network.sent.bytes',
    metricAgg: 'max',
    derivative: true,
    label: i18n.translate('xpack.monitoring.metrics.entSearch.http_bytes_sent.rate', {
      defaultMessage: 'Sent',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.entSearch.http_bytes_sent.rate.description',
      {
        defaultMessage: 'Outgoing HTTP traffic across all instances in the deployment.',
      }
    ),
    format: LARGE_BYTES,
    units: perSecondUnitLabel,
  }),

  enterprise_search_http_1xx_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.responses.1xx',
    metricAgg: 'max',
    derivative: true,
    title: i18n.translate('xpack.monitoring.metrics.entSearch.http_response_rate', {
      defaultMessage: 'HTTP Responses',
    }),
    label: '1xx',
    description: i18n.translate('xpack.monitoring.metrics.entSearch.http_1xx.rate.description', {
      defaultMessage: 'Outgoing HTTP 1xx responses across all instances in the deployment.',
    }),
    format: LARGE_FLOAT,
    units: perSecondUnitLabel,
  }),

  enterprise_search_http_2xx_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.responses.2xx',
    metricAgg: 'max',
    derivative: true,
    label: '2xx',
    description: i18n.translate('xpack.monitoring.metrics.entSearch.http_2xx.rate.description', {
      defaultMessage: 'Outgoing HTTP 2xx responses across all instances in the deployment.',
    }),
    format: LARGE_FLOAT,
    units: perSecondUnitLabel,
  }),

  enterprise_search_http_3xx_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.responses.3xx',
    metricAgg: 'max',
    derivative: true,
    label: '3xx',
    description: i18n.translate('xpack.monitoring.metrics.entSearch.http_3xx.rate.description', {
      defaultMessage: 'Outgoing HTTP 3xx responses across all instances in the deployment.',
    }),
    format: LARGE_FLOAT,
    units: perSecondUnitLabel,
  }),

  enterprise_search_http_4xx_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.responses.4xx',
    metricAgg: 'max',
    derivative: true,
    label: '4xx',
    description: i18n.translate('xpack.monitoring.metrics.entSearch.http_4xx.rate.description', {
      defaultMessage: 'Outgoing HTTP 4xx responses across all instances in the deployment.',
    }),
    format: LARGE_FLOAT,
    units: perSecondUnitLabel,
  }),

  enterprise_search_http_5xx_rate: new EnterpriseSearchMetric({
    field: 'enterprisesearch.stats.http.responses.5xx',
    metricAgg: 'max',
    derivative: true,
    label: '5xx',
    description: i18n.translate('xpack.monitoring.metrics.entSearch.http_5xx.rate.description', {
      defaultMessage: 'Outgoing HTTP 5xx responses across all instances in the deployment.',
    }),
    format: LARGE_FLOAT,
    units: perSecondUnitLabel,
  }),
};
