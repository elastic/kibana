/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QuotaMetric } from '../classes';
import {
  RequestRateMetric,
  LatencyMetric,
  ElasticsearchMetric,
  SingleIndexMemoryMetric,
  IndexMemoryMetric,
  NodeIndexMemoryMetric,
  ThreadPoolQueueMetric,
  ThreadPoolRejectedMetric,
  WriteThreadPoolQueueMetric,
  WriteThreadPoolRejectedMetric,
  DifferenceMetric,
  MillisecondsToSecondsMetric,
} from './classes';
import {
  LARGE_FLOAT,
  SMALL_FLOAT,
  SMALL_BYTES,
  LARGE_BYTES,
  LARGE_ABBREVIATED,
} from '../../../../common/formatting';
import { i18n } from '@kbn/i18n';

const indexingRateTitle = i18n.translate('xpack.monitoring.metrics.es.indexingRateTitle', {
  defaultMessage: 'Indexing Rate', // title to use for the chart
});
const nodeLatencyTitle = i18n.translate('xpack.monitoring.metrics.esNode.latencyTitle', {
  defaultMessage: 'Latency',
});
const indexRequestTimeTitle = i18n.translate('xpack.monitoring.metrics.esIndex.requestTimeTitle', {
  defaultMessage: 'Request Time',
});
const indexIndexingRateTitle = i18n.translate(
  'xpack.monitoring.metrics.esIndex.indexingRateTitle',
  {
    defaultMessage: 'Indexing Rate',
  }
);
const nodeIoRateTitle = i18n.translate('xpack.monitoring.metrics.esNode.ioRateTitle', {
  defaultMessage: 'I/O Operations Rate',
});
const indexSegmentCountTitle = i18n.translate(
  'xpack.monitoring.metrics.esIndex.segmentCountTitle',
  {
    defaultMessage: 'Segment Count',
  }
);
const indexDiskTitle = i18n.translate('xpack.monitoring.metrics.esIndex.diskTitle', {
  defaultMessage: 'Disk',
});
const indexRefreshTimeTitle = i18n.translate('xpack.monitoring.metrics.esIndex.refreshTimeTitle', {
  defaultMessage: 'Refresh Time',
});
const indexThrottleTimeTitle = i18n.translate(
  'xpack.monitoring.metrics.esIndex.throttleTimeTitle',
  {
    defaultMessage: 'Throttle Time',
  }
);
const nodeCgroupCfsStats = i18n.translate('xpack.monitoring.metrics.esNode.cgroupCfsStatsTitle', {
  defaultMessage: 'Cgroup CFS Stats',
});
const nodeCgroupCpuPerformance = i18n.translate(
  'xpack.monitoring.metrics.esNode.cgroupCpuPerformanceTitle',
  {
    defaultMessage: 'Cgroup CPU Performance',
  }
);
const nodeCpuUtilizationLabel = i18n.translate(
  'xpack.monitoring.metrics.esNode.cpuUtilizationLabel',
  {
    defaultMessage: 'CPU Utilization',
  }
);
const nodeGcCount = i18n.translate('xpack.monitoring.metrics.esNode.gsCountTitle', {
  defaultMessage: 'GC Count',
});
const nodeGcDuration = i18n.translate('xpack.monitoring.metrics.esNode.gsDurationTitle', {
  defaultMessage: 'GC Duration',
});
const nodeJvmHeap = i18n.translate('xpack.monitoring.metrics.esNode.jvmHeapTitle', {
  defaultMessage: '{javaVirtualMachine} Heap',
  values: { javaVirtualMachine: 'JVM' },
});
const nodeUsedHeapLabel = i18n.translate('xpack.monitoring.metrics.esNode.jvmHeap.usedHeapLabel', {
  defaultMessage: 'Used Heap',
});
const nodeUsedHeapDescription = i18n.translate(
  'xpack.monitoring.metrics.esNode.jvmHeap.usedHeapDescription',
  {
    defaultMessage: 'Total heap used by Elasticsearch running in the JVM.',
  }
);
const nodeReadThreads = i18n.translate('xpack.monitoring.metrics.esNode.readThreadsTitle', {
  defaultMessage: 'Read Threads',
});
const nodeIndexingThreads = i18n.translate('xpack.monitoring.metrics.esNode.indexingThreadsTitle', {
  defaultMessage: 'Indexing Threads',
});
const msTimeUnitLabel = i18n.translate('xpack.monitoring.metrics.es.msTimeUnitLabel', {
  defaultMessage: 'ms',
});
const nsTimeUnitLabel = i18n.translate('xpack.monitoring.metrics.es.nsTimeUnitLabel', {
  defaultMessage: 'ns',
});
const perSecondUnitLabel = i18n.translate('xpack.monitoring.metrics.es.perSecondTimeUnitLabel', {
  defaultMessage: '/s',
});

export const metrics = {
  cluster_index_request_rate_primary: new RequestRateMetric({
    title: indexingRateTitle, // title to use for the chart
    label: i18n.translate('xpack.monitoring.metrics.es.indexingRate.primaryShardsLabel', {
      defaultMessage: 'Primary Shards', // label to use for this line in the chart
    }),
    field: 'indices_stats._all.primaries.indexing.index_total',
    description: i18n.translate(
      'xpack.monitoring.metrics.es.indexingRate.primaryShardsDescription',
      {
        defaultMessage: 'Number of documents being indexed for primary shards.',
      }
    ),
    type: 'index',
  }),
  cluster_index_request_rate_total: new RequestRateMetric({
    field: 'indices_stats._all.total.indexing.index_total',
    title: indexingRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.es.indexingRate.totalShardsLabel', {
      defaultMessage: 'Total Shards',
    }),
    description: i18n.translate('xpack.monitoring.metrics.es.indexingRate.totalShardsDescription', {
      defaultMessage: 'Number of documents being indexed for primary and replica shards.',
    }),
    type: 'index',
  }),
  cluster_search_request_rate: new RequestRateMetric({
    field: 'indices_stats._all.total.search.query_total',
    title: i18n.translate('xpack.monitoring.metrics.es.searchRateTitle', {
      defaultMessage: 'Search Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.es.searchRate.totalShardsLabel', {
      defaultMessage: 'Total Shards',
    }),
    description: i18n.translate('xpack.monitoring.metrics.es.searchRate.totalShardsDescription', {
      defaultMessage:
        'Number of search requests being executed across primary and replica shards. A single search can run against multiple shards!',
    }),
    type: 'cluster',
  }),
  cluster_index_latency: new LatencyMetric({
    metric: 'index',
    fieldSource: 'indices_stats._all.primaries',
    field: 'indices_stats._all.primaries.indexing.index_total',
    label: i18n.translate('xpack.monitoring.metrics.es.indexingLatencyLabel', {
      defaultMessage: 'Indexing Latency',
    }),
    description: i18n.translate('xpack.monitoring.metrics.es.indexingLatencyDescription', {
      defaultMessage:
        'Average latency for indexing documents, which is time it takes to index documents divided by number ' +
        'that were indexed. This only considers primary shards.',
    }),
    type: 'cluster',
  }),
  node_index_latency: new LatencyMetric({
    metric: 'index',
    fieldSource: 'node_stats.indices',
    field: 'node_stats.indices.indexing.index_total',
    title: nodeLatencyTitle,
    label: i18n.translate('xpack.monitoring.metrics.esNode.latency.indexingLabel', {
      defaultMessage: 'Indexing',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.latency.indexingDescription', {
      defaultMessage:
        'Average latency for indexing documents, which is time it takes to index documents divided by number ' +
        'that were indexed. This considers any shard located on this node, including replicas.',
    }),
    type: 'node',
  }),
  index_index_latency: new LatencyMetric({
    metric: 'index',
    fieldSource: 'index_stats.primaries',
    field: 'index_stats.primaries.indexing.index_total',
    title: i18n.translate('xpack.monitoring.metrics.esIndex.latencyTitle', {
      defaultMessage: 'Latency',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esIndex.latency.indexingLatencyLabel', {
      defaultMessage: 'Indexing Latency',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.latency.indexingLatencyDescription',
      {
        defaultMessage:
          'Average latency for indexing documents, which is time it takes to index documents divided by number ' +
          'that were indexed. This only considers primary shards.',
      }
    ),
    type: 'cluster',
  }),
  cluster_query_latency: new LatencyMetric({
    metric: 'query',
    fieldSource: 'indices_stats._all.total',
    field: 'indices_stats._all.total.search.query_total',
    label: i18n.translate('xpack.monitoring.metrics.es.searchLatencyLabel', {
      defaultMessage: 'Search Latency',
    }),
    description: i18n.translate('xpack.monitoring.metrics.es.searchLatencyDescription', {
      defaultMessage:
        'Average latency for searching, which is time it takes to execute searches divided by number of ' +
        'searches submitted. This considers primary and replica shards.',
    }),
    type: 'cluster',
  }),
  node_query_latency: new LatencyMetric({
    metric: 'query',
    fieldSource: 'node_stats.indices',
    field: 'node_stats.indices.search.query_total',
    title: nodeLatencyTitle,
    label: i18n.translate('xpack.monitoring.metrics.esNode.latency.searchLabel', {
      defaultMessage: 'Search',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.latency.searchDescription', {
      defaultMessage:
        'Average latency for searching, which is time it takes to execute searches divided by number of searches ' +
        'submitted. This considers primary and replica shards.',
    }),
    type: 'node',
  }),
  index_query_latency: new LatencyMetric({
    metric: 'query',
    fieldSource: 'index_stats.total',
    field: 'index_stats.total.search.query_total',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.latency.searchLatencyLabel', {
      defaultMessage: 'Search Latency',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.latency.searchLatencyDescription',
      {
        defaultMessage:
          'Average latency for searching, which is time it takes to execute searches divided by number of searches ' +
          'submitted. This considers primary and replica shards.',
      }
    ),
    type: 'cluster',
  }),
  index_indexing_primaries_time: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.index_time_in_millis',
    title: indexRequestTimeTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.requestTime.indexingPrimariesLabel', {
      defaultMessage: 'Indexing (Primaries)',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.requestTime.indexingPrimariesDescription',
      {
        defaultMessage: 'Amount of time spent performing index operations on primary shards only.',
      }
    ),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  index_indexing_total_time: new ElasticsearchMetric({
    field: 'index_stats.total.indexing.index_time_in_millis',
    title: indexRequestTimeTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.requestTime.indexingLabel', {
      defaultMessage: 'Indexing',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.requestTime.indexingDescription',
      {
        defaultMessage:
          'Amount of time spent performing index operations on primary and replica shards.',
      }
    ),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  index_indexing_total: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.index_total',
    title: i18n.translate('xpack.monitoring.metrics.esIndex.requestRateTitle', {
      defaultMessage: 'Request Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esIndex.requestRate.indexTotalLabel', {
      defaultMessage: 'Index Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.requestRate.indexTotalDescription',
      {
        defaultMessage: 'Amount of indexing operations.',
      }
    ),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  index_mem_overall: new SingleIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.luceneTotalLabel', {
      defaultMessage: 'Lucene Total',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.luceneTotalDescription', {
      defaultMessage:
        'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards.',
    }),
  }),
  index_mem_overall_1: new SingleIndexMemoryMetric({
    field: 'memory_in_bytes',
    title: i18n.translate('xpack.monitoring.metrics.esIndex.indexMemoryLucene1Title', {
      defaultMessage: 'Index Memory - Lucene 1',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esIndex.indexMemoryLucene1.luceneTotalLabel', {
      defaultMessage: 'Lucene Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.indexMemoryLucene1.luceneTotalDescription',
      {
        defaultMessage:
          'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards.',
      }
    ),
  }),
  index_mem_overall_2: new SingleIndexMemoryMetric({
    field: 'memory_in_bytes',
    title: i18n.translate('xpack.monitoring.metrics.esIndex.indexMemoryLucene2Title', {
      defaultMessage: 'Index Memory - Lucene 2',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esIndex.indexMemoryLucene2.luceneTotalLabel', {
      defaultMessage: 'Lucene Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.indexMemoryLucene2.luceneTotalDescription',
      {
        defaultMessage:
          'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards.',
      }
    ),
  }),
  index_mem_overall_3: new SingleIndexMemoryMetric({
    field: 'memory_in_bytes',
    title: i18n.translate('xpack.monitoring.metrics.esIndex.indexMemoryLucene3Title', {
      defaultMessage: 'Index Memory - Lucene 3',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esIndex.indexMemoryLucene3.luceneTotalLabel', {
      defaultMessage: 'Lucene Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.indexMemoryLucene3.luceneTotalDescription',
      {
        defaultMessage:
          'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards.',
      }
    ),
  }),
  index_mem_doc_values: new SingleIndexMemoryMetric({
    field: 'doc_values_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.docValuesLabel', {
      defaultMessage: 'Doc Values',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.docValuesDescription', {
      defaultMessage: 'Heap memory used by Doc Values. This is a part of Lucene Total.',
    }),
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  index_mem_fielddata: new IndexMemoryMetric({
    field: 'index_stats.total.fielddata.memory_size_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.fielddataLabel', {
      defaultMessage: 'Fielddata',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.fielddataDescription', {
      defaultMessage:
        'Heap memory used by Fielddata (e.g., global ordinals or explicitly enabled fielddata on text fields). ' +
        'This is for the same shards, but not a part of Lucene Total.',
    }),
    type: 'index',
  }),
  index_mem_fixed_bit_set: new SingleIndexMemoryMetric({
    field: 'fixed_bit_set_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.fixedBitsetsLabel', {
      defaultMessage: 'Fixed Bitsets',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.fixedBitsetsDescription', {
      defaultMessage:
        'Heap memory used by Fixed Bit Sets (e.g., deeply nested documents). This is a part of Lucene Total.',
    }),
  }),
  index_mem_norms: new SingleIndexMemoryMetric({
    field: 'norms_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.normsLabel', {
      defaultMessage: 'Norms',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.normsDescription', {
      defaultMessage:
        'Heap memory used by Norms (normalization factors for query-time, text scoring). This is a part of Lucene Total.',
    }),
  }),
  index_mem_points: new SingleIndexMemoryMetric({
    field: 'points_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.pointsLabel', {
      defaultMessage: 'Points',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.pointsDescription', {
      defaultMessage:
        'Heap memory used by Points (e.g., numbers, IPs, and geo data). This is a part of Lucene Total.',
    }),
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  index_mem_query_cache: new IndexMemoryMetric({
    field: 'index_stats.total.query_cache.memory_size_in_bytes',
    title: i18n.translate('xpack.monitoring.metrics.esIndex.indexMemoryEsTitle', {
      defaultMessage: 'Index Memory - {elasticsearch}',
      values: { elasticsearch: 'Elasticsearch' },
    }),
    label: i18n.translate('xpack.monitoring.metrics.esIndex.indexMemoryEs.queryCacheLabel', {
      defaultMessage: 'Query Cache',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.indexMemoryEs.queryCacheDescription',
      {
        defaultMessage:
          'Heap memory used by Query Cache (e.g., cached filters). This is for the same shards, but not a part of Lucene Total.',
      }
    ),
    type: 'index',
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  index_mem_request_cache: new IndexMemoryMetric({
    field: 'index_stats.total.request_cache.memory_size_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.requestCacheLabel', {
      defaultMessage: 'Request Cache',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.requestCacheDescription', {
      defaultMessage:
        'Heap memory used by Request Cache (e.g., instant aggregations). This is for the same shards, but not a part of Lucene Total.',
    }),
    type: 'index',
  }),
  index_mem_stored_fields: new SingleIndexMemoryMetric({
    field: 'stored_fields_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.storedFieldsLabel', {
      defaultMessage: 'Stored Fields',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.storedFieldsDescription', {
      defaultMessage:
        'Heap memory used by Stored Fields (e.g., _source). This is a part of Lucene Total.',
    }),
  }),
  index_mem_term_vectors: new SingleIndexMemoryMetric({
    field: 'term_vectors_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.termVectorsLabel', {
      defaultMessage: 'Term Vectors',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.termVectorsDescription', {
      defaultMessage: 'Heap memory used by Term Vectors. This is a part of Lucene Total.',
    }),
  }),
  index_mem_terms: new SingleIndexMemoryMetric({
    field: 'terms_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.termsLabel', {
      defaultMessage: 'Terms',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.termsDescription', {
      defaultMessage: 'Heap memory used by Terms (e.g., text). This is a part of Lucene Total.',
    }),
  }),
  index_mem_versions: new SingleIndexMemoryMetric({
    field: 'version_map_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.versionMapLabel', {
      defaultMessage: 'Version Map',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.versionMapDescription', {
      defaultMessage:
        'Heap memory used by Versioning (e.g., updates and deletes). This is NOT a part of Lucene Total.',
    }),
  }),
  index_mem_writer: new SingleIndexMemoryMetric({
    field: 'index_writer_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esIndex.indexWriterLabel', {
      defaultMessage: 'Index Writer',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.indexWriterDescription', {
      defaultMessage: 'Heap memory used by the Index Writer. This is NOT a part of Lucene Total.',
    }),
  }),
  node_total_cumul_io: new RequestRateMetric({
    field: 'node_stats.fs.io_stats.total.operations',
    title: nodeIoRateTitle,
    format: LARGE_FLOAT,
    units: 'ops',
    type: 'node',
    derivative: true,
    label: i18n.translate('xpack.monitoring.metrics.esNode.totalIoLabel', {
      defaultMessage: 'Total I/O',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.totalIoDescription', {
      defaultMessage:
        'Total I/O. (This metric is not supported on all platforms and may display N/A if I/O data is unavailable.)',
    }),
  }),
  node_total_read_io: new RequestRateMetric({
    field: 'node_stats.fs.io_stats.total.read_operations',
    title: nodeIoRateTitle,
    format: LARGE_FLOAT,
    units: 'ops',
    type: 'node',
    derivative: true,
    label: i18n.translate('xpack.monitoring.metrics.esNode.totalIoReadLabel', {
      defaultMessage: 'Total Read I/O',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.totalIoReadDescription', {
      defaultMessage:
        'Total Read I/O. (This metric is not supported on all platforms and may display N/A if I/O data is unavailable.)',
    }),
  }),
  node_total_write_io: new RequestRateMetric({
    field: 'node_stats.fs.io_stats.total.write_operations',
    title: nodeIoRateTitle,
    format: LARGE_FLOAT,
    units: 'ops',
    type: 'node',
    derivative: true,
    label: i18n.translate('xpack.monitoring.metrics.esNode.totalIoWriteLabel', {
      defaultMessage: 'Total Write I/O',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.totalIoWriteDescription', {
      defaultMessage:
        'Total Write I/O. (This metric is not supported on all platforms and may display N/A if I/O data is unavailable.)',
    }),
  }),
  index_request_rate_primary: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.index_total',
    title: indexIndexingRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.indexingRate.primaryShardsLabel', {
      defaultMessage: 'Primary Shards',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.indexingRate.primaryShardsDescription',
      {
        defaultMessage: 'Number of documents being indexed for primary shards.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: perSecondUnitLabel,
    type: 'index',
    derivative: true,
  }),
  index_request_rate_total: new RequestRateMetric({
    field: 'index_stats.total.indexing.index_total',
    title: indexIndexingRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.indexingRate.totalShardsLabel', {
      defaultMessage: 'Total Shards',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.indexingRate.totalShardsDescription',
      {
        defaultMessage: 'Number of documents being indexed for primary and replica shards.',
      }
    ),
    type: 'index',
  }),
  index_searching_time: new ElasticsearchMetric({
    field: 'index_stats.total.search.query_time_in_millis',
    title: i18n.translate('xpack.monitoring.metrics.esIndex.requestTimeTitle', {
      defaultMessage: 'Request Time',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esIndex.requestTime.searchLabel', {
      defaultMessage: 'Search',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.requestTime.searchDescription', {
      defaultMessage: 'Amount of time spent performing search operations (per shard).',
    }),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  index_searching_total: new ElasticsearchMetric({
    field: 'index_stats.total.search.query_total',
    title: i18n.translate('xpack.monitoring.metrics.esIndex.requestRateTitle', {
      defaultMessage: 'Request Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esIndex.requestRate.searchTotalLabel', {
      defaultMessage: 'Search Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.requestRate.searchTotalDescription',
      {
        defaultMessage: 'Amount of search operations (per shard).',
      }
    ),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  index_segment_count_primaries: new ElasticsearchMetric({
    field: 'index_stats.primaries.segments.count',
    title: indexSegmentCountTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.segmentCount.primariesLabel', {
      defaultMessage: 'Primaries',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.segmentCount.primariesDescription',
      {
        defaultMessage: 'Number of segments for primary shards.',
      }
    ),
    type: 'index',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  index_segment_count_total: new ElasticsearchMetric({
    field: 'index_stats.total.segments.count',
    title: indexSegmentCountTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.segmentCount.totalLabel', {
      defaultMessage: 'Total',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.segmentCount.totalDescription', {
      defaultMessage: 'Number of segments for primary and replica shards.',
    }),
    type: 'index',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  index_segment_merge_primaries_size: new ElasticsearchMetric({
    field: 'index_stats.primaries.merges.total_size_in_bytes',
    title: indexDiskTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.disk.mergesPrimariesLabel', {
      defaultMessage: 'Merges (Primaries)',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.disk.mergesPrimariesDescription',
      {
        defaultMessage: 'Size of merges on primary shards.',
      }
    ),
    type: 'index',
    derivative: true,
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  index_segment_merge_total_size: new ElasticsearchMetric({
    field: 'index_stats.total.merges.total_size_in_bytes',
    title: indexDiskTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.disk.mergesLabel', {
      defaultMessage: 'Merges',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.disk.mergesDescription', {
      defaultMessage: 'Size of merges on primary and replica shards.',
    }),
    type: 'index',
    derivative: true,
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  index_segment_refresh_primaries_time: new ElasticsearchMetric({
    field: 'index_stats.primaries.refresh.total_time_in_millis',
    title: indexRefreshTimeTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.refreshTime.primariesLabel', {
      defaultMessage: 'Primaries',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.refreshTime.primariesDescription',
      {
        defaultMessage: 'Amount of time spent to perform refresh operations on primary shards.',
      }
    ),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  index_segment_refresh_total_time: new ElasticsearchMetric({
    field: 'index_stats.total.refresh.total_time_in_millis',
    title: indexRefreshTimeTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.refreshTime.totalLabel', {
      defaultMessage: 'Total',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.refreshTime.totalDescription', {
      defaultMessage:
        'Amount of time spent to perform refresh operations on primary and replica shards.',
    }),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  index_throttling_indexing_primaries_time: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.throttle_time_in_millis',
    title: indexThrottleTimeTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.throttleTime.indexingPrimariesLabel', {
      defaultMessage: 'Indexing (Primaries)',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.throttleTime.indexingPrimariesDescription',
      {
        defaultMessage: 'Amount of time spent throttling index operations on primary shards.',
      }
    ),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  index_throttling_indexing_total_time: new ElasticsearchMetric({
    field: 'index_stats.total.indexing.throttle_time_in_millis',
    title: indexThrottleTimeTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.throttleTime.indexingLabel', {
      defaultMessage: 'Indexing',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.throttleTime.indexingDescription',
      {
        defaultMessage:
          'Amount of time spent throttling index operations on primary and replica shards.',
      }
    ),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  index_store_primaries_size: new ElasticsearchMetric({
    field: 'index_stats.primaries.store.size_in_bytes',
    title: indexDiskTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.disk.storePrimariesLabel', {
      defaultMessage: 'Store (Primaries)',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.disk.storePrimariesDescription', {
      defaultMessage: 'Size of primary shards on disk.',
    }),
    type: 'index',
    derivative: false,
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  index_store_total_size: new ElasticsearchMetric({
    field: 'index_stats.total.store.size_in_bytes',
    title: indexDiskTitle,
    label: i18n.translate('xpack.monitoring.metrics.esIndex.disk.storeLabel', {
      defaultMessage: 'Store',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esIndex.disk.storeDescription', {
      defaultMessage: 'Size of primary and replica shards on disk.',
    }),
    type: 'index',
    derivative: false,
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  search_request_rate: new RequestRateMetric({
    field: 'index_stats.total.search.query_total',
    title: i18n.translate('xpack.monitoring.metrics.esIndex.searchRateTitle', {
      defaultMessage: 'Search Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esIndex.searchRate.totalShardsLabel', {
      defaultMessage: 'Total Shards',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esIndex.searchRate.totalShardsDescription',
      {
        defaultMessage:
          'Number of search requests being executed across primary and replica shards. A single search can run against multiple shards!',
      }
    ),
    type: 'cluster',
  }),
  node_cgroup_periods: new ElasticsearchMetric({
    field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
    title: nodeCgroupCfsStats,
    label: i18n.translate(
      'xpack.monitoring.metrics.esNode.cgroupCfsStats.cgroupElapsedPeriodsLabel',
      {
        defaultMessage: 'Cgroup Elapsed Periods',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.cgroupCfsStats.cgroupElapsedPeriodsDescription',
      {
        defaultMessage:
          'The number of sampling periods from the Completely Fair Scheduler (CFS). Compare against the number of times throttled.',
      }
    ),
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    derivative: true,
    units: '',
  }),
  node_cgroup_throttled: new ElasticsearchMetric({
    field: 'node_stats.os.cgroup.cpu.stat.time_throttled_nanos',
    title: nodeCgroupCpuPerformance,
    label: i18n.translate(
      'xpack.monitoring.metrics.esNode.cgroupCpuPerformance.cgroupThrottlingLabel',
      {
        defaultMessage: 'Cgroup Throttling',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.cgroupCpuPerformance.cgroupThrottlingDescription',
      {
        defaultMessage: 'The amount of throttled time, reported in nanoseconds, of the Cgroup.',
      }
    ),
    type: 'node',
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    derivative: true,
    units: nsTimeUnitLabel,
  }),
  node_cgroup_throttled_count: new ElasticsearchMetric({
    field: 'node_stats.os.cgroup.cpu.stat.number_of_times_throttled',
    title: nodeCgroupCfsStats,
    label: i18n.translate(
      'xpack.monitoring.metrics.esNode.cgroupCfsStats.cgroupThrottledCountLabel',
      {
        defaultMessage: 'Cgroup Throttled Count',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.cgroupCfsStats.cgroupThrottledCountDescription',
      {
        defaultMessage: 'The number of times that the CPU was throttled by the Cgroup.',
      }
    ),
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    derivative: true,
    units: '',
  }),
  node_cgroup_usage: new ElasticsearchMetric({
    field: 'node_stats.os.cgroup.cpuacct.usage_nanos',
    title: nodeCgroupCpuPerformance,
    label: i18n.translate('xpack.monitoring.metrics.esNode.cgroupCpuPerformance.cgroupUsageLabel', {
      defaultMessage: 'Cgroup Usage',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.cgroupCpuPerformance.cgroupUsageDescription',
      {
        defaultMessage:
          'The usage, reported in nanoseconds, of the Cgroup. Compare this with the throttling to discover issues.',
      }
    ),
    type: 'node',
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    derivative: true,
    units: nsTimeUnitLabel,
  }),
  ...(() => {
    // CGroup CPU Utilization Fields
    const quotaMetricConfig = {
      app: 'elasticsearch',
      uuidField: 'source_node.uuid',
      timestampField: 'timestamp',
      fieldSource: 'node_stats.os.cgroup',
      usageField: 'cpuacct.usage_nanos',
      periodsField: 'cpu.stat.number_of_elapsed_periods',
      quotaField: 'cpu.cfs_quota_micros',
      field: 'node_stats.process.cpu.percent', // backup field if quota is not configured
      label: i18n.translate(
        'xpack.monitoring.metrics.esNode.cpuUtilization.cgroupCpuUtilizationLabel',
        {
          defaultMessage: 'Cgroup CPU Utilization',
        }
      ),
      description: i18n.translate(
        'xpack.monitoring.metrics.esNode.cpuUtilization.cgroupCpuUtilizationDescription',
        {
          defaultMessage:
            'CPU Usage time compared to the CPU quota shown in percentage. If CPU quotas are not set, then no data will be shown.',
        }
      ),
      type: 'node',
    };
    return {
      node_cgroup_quota: new QuotaMetric({
        ...quotaMetricConfig,
        title: i18n.translate('xpack.monitoring.metrics.esNode.cpuUtilizationTitle', {
          defaultMessage: 'CPU Utilization',
        }),
      }),
      node_cgroup_quota_as_cpu_utilization: new QuotaMetric({
        ...quotaMetricConfig,
        label: nodeCpuUtilizationLabel, //  override the "Cgroup CPU..." label
      }),
    };
  })(),
  node_cpu_utilization: new ElasticsearchMetric({
    field: 'node_stats.process.cpu.percent',
    label: nodeCpuUtilizationLabel,
    description: i18n.translate('xpack.monitoring.metrics.esNode.cpuUtilizationDescription', {
      defaultMessage: 'Percentage of CPU usage for the Elasticsearch process.',
    }),
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '%',
  }),
  node_segment_count: new ElasticsearchMetric({
    field: 'node_stats.indices.segments.count',
    label: i18n.translate('xpack.monitoring.metrics.esNode.segmentCountLabel', {
      defaultMessage: 'Segment Count',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.segmentCountDescription', {
      defaultMessage: 'Maximum segment count for primary and replica shards on this node.',
    }),
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  node_jvm_gc_old_count: new ElasticsearchMetric({
    field: 'node_stats.jvm.gc.collectors.old.collection_count',
    title: nodeGcCount,
    label: i18n.translate('xpack.monitoring.metrics.esNode.gcCount.oldLabel', {
      defaultMessage: 'Old',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.gcCount.oldDescription', {
      defaultMessage: 'Number of old Garbage Collections.',
    }),
    derivative: true,
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
    type: 'node',
  }),
  node_jvm_gc_old_time: new ElasticsearchMetric({
    field: 'node_stats.jvm.gc.collectors.old.collection_time_in_millis',
    title: nodeGcDuration,
    label: i18n.translate('xpack.monitoring.metrics.esNode.gcDuration.oldLabel', {
      defaultMessage: 'Old',
    }),
    derivative: true,
    description: i18n.translate('xpack.monitoring.metrics.esNode.gcDuration.oldDescription', {
      defaultMessage: 'Time spent performing old Garbage Collections.',
    }),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
    type: 'node',
  }),
  node_jvm_gc_young_count: new ElasticsearchMetric({
    field: 'node_stats.jvm.gc.collectors.young.collection_count',
    title: nodeGcCount,
    label: i18n.translate('xpack.monitoring.metrics.esNode.gcCount.youngLabel', {
      defaultMessage: 'Young',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.gcCount.youngDescription', {
      defaultMessage: 'Number of young Garbage Collections.',
    }),
    derivative: true,
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
    type: 'node',
  }),
  node_jvm_gc_young_time: new ElasticsearchMetric({
    field: 'node_stats.jvm.gc.collectors.young.collection_time_in_millis',
    title: nodeGcDuration,
    label: i18n.translate('xpack.monitoring.metrics.esNode.gcDuration.youngLabel', {
      defaultMessage: 'Young',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.gcDuration.youngDescription', {
      defaultMessage: 'Time spent performing young Garbage Collections.',
    }),
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
    type: 'node',
  }),
  node_jvm_mem_max_in_bytes: new ElasticsearchMetric({
    field: 'node_stats.jvm.mem.heap_max_in_bytes',
    title: nodeJvmHeap,
    label: i18n.translate('xpack.monitoring.metrics.esNode.jvmHeap.maxHeapLabel', {
      defaultMessage: 'Max Heap',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.jvmHeap.maxHeapDescription', {
      defaultMessage: 'Total heap available to Elasticsearch running in the JVM.',
    }),
    type: 'node',
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  node_jvm_mem_used_in_bytes: new ElasticsearchMetric({
    field: 'node_stats.jvm.mem.heap_used_in_bytes',
    title: nodeJvmHeap,
    label: nodeUsedHeapLabel,
    description: nodeUsedHeapDescription,
    type: 'node',
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  node_jvm_mem_percent: new ElasticsearchMetric({
    field: 'node_stats.jvm.mem.heap_used_percent',
    title: nodeJvmHeap,
    label: nodeUsedHeapLabel,
    description: nodeUsedHeapDescription,
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '%',
  }),
  node_load_average: new ElasticsearchMetric({
    field: 'node_stats.os.cpu.load_average.1m',
    title: i18n.translate('xpack.monitoring.metrics.esNode.systemLoadTitle', {
      defaultMessage: 'System Load',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esNode.systemLoad.last1MinuteLabel', {
      defaultMessage: '1m',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.systemLoad.last1MinuteDescription',
      {
        defaultMessage: 'Load average over the last minute.',
      }
    ),
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  node_index_mem_overall: new NodeIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.luceneTotalLabel', {
      defaultMessage: 'Lucene Total',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.luceneTotalDescription', {
      defaultMessage:
        'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards on this node.',
    }),
  }),
  node_index_mem_overall_1: new NodeIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexMemoryLucene1.lucenceTotalLabel', {
      defaultMessage: 'Lucene Total',
    }),
    title: i18n.translate('xpack.monitoring.metrics.esNode.indexMemoryLucene1Title', {
      defaultMessage: 'Index Memory - Lucene 1',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.indexMemoryLucene1.lucenceTotalDescription',
      {
        defaultMessage:
          'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards on this node.',
      }
    ),
  }),
  node_index_mem_overall_2: new NodeIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexMemoryLucene2.lucenceTotalLabel', {
      defaultMessage: 'Lucene Total',
    }),
    title: i18n.translate('xpack.monitoring.metrics.esNode.indexMemoryLucene2Title', {
      defaultMessage: 'Index Memory - Lucene 2',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.indexMemoryLucene2.lucenceTotalDescription',
      {
        defaultMessage:
          'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards on this node.',
      }
    ),
  }),
  node_index_mem_overall_3: new NodeIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexMemoryLucene3.lucenceTotalLabel', {
      defaultMessage: 'Lucene Total',
    }),
    title: i18n.translate('xpack.monitoring.metrics.esNode.indexMemoryLucene3Title', {
      defaultMessage: 'Index Memory - Lucene 3',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.indexMemoryLucene3.lucenceTotalDescription',
      {
        defaultMessage:
          'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards on this node.',
      }
    ),
  }),
  node_index_mem_doc_values: new NodeIndexMemoryMetric({
    field: 'doc_values_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.docValuesLabel', {
      defaultMessage: 'Doc Values',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.docValuesDescription', {
      defaultMessage: 'Heap memory used by Doc Values. This is a part of Lucene Total.',
    }),
  }),
  // Note: This is not segment memory, unlike the rest of the SingleIndexMemoryMetrics
  node_index_mem_fielddata: new IndexMemoryMetric({
    field: 'node_stats.indices.fielddata.memory_size_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.fielddataLabel', {
      defaultMessage: 'Fielddata',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.fielddataDescription', {
      defaultMessage:
        'Heap memory used by Fielddata (e.g., global ordinals or explicitly enabled fielddata on text fields). ' +
        'This is for the same shards, but not a part of Lucene Total.',
    }),
    type: 'node',
  }),
  node_index_mem_fixed_bit_set: new NodeIndexMemoryMetric({
    field: 'fixed_bit_set_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.fixedBitsetsLabel', {
      defaultMessage: 'Fixed Bitsets',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.fixedBitsetsDescription', {
      defaultMessage:
        'Heap memory used by Fixed Bit Sets (e.g., deeply nested documents). This is a part of Lucene Total.',
    }),
  }),
  node_index_mem_norms: new NodeIndexMemoryMetric({
    field: 'norms_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.normsLabel', {
      defaultMessage: 'Norms',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.normsDescription', {
      defaultMessage:
        'Heap memory used by Norms (normalization factors for query-time, text scoring). This is a part of Lucene Total.',
    }),
  }),
  node_index_mem_points: new NodeIndexMemoryMetric({
    field: 'points_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.pointsLabel', {
      defaultMessage: 'Points',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.pointsDescription', {
      defaultMessage:
        'Heap memory used by Points (e.g., numbers, IPs, and geo data). This is a part of Lucene Total.',
    }),
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  node_index_mem_query_cache: new IndexMemoryMetric({
    field: 'node_stats.indices.query_cache.memory_size_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexMemoryEs.queryCacheLabel', {
      defaultMessage: 'Query Cache',
    }),
    title: i18n.translate('xpack.monitoring.metrics.esNode.indexMemoryEsTitle', {
      defaultMessage: 'Index Memory - {elasticsearch}',
      values: { elasticsearch: 'Elasticsearch' },
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.indexMemoryEs.queryCacheDescription',
      {
        defaultMessage:
          'Heap memory used by Query Cache (e.g., cached filters). This is for the same shards, but not a part of Lucene Total.',
      }
    ),
    type: 'node',
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  node_index_mem_request_cache: new IndexMemoryMetric({
    field: 'node_stats.indices.request_cache.memory_size_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.requestCacheLabel', {
      defaultMessage: 'Request Cache',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.requestCacheDescription', {
      defaultMessage:
        'Heap memory used by Request Cache (e.g., instant aggregations). This is for the same shards, but not a part of Lucene Total.',
    }),
    type: 'node',
  }),
  node_index_mem_stored_fields: new NodeIndexMemoryMetric({
    field: 'stored_fields_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.storedFieldsLabel', {
      defaultMessage: 'Stored Fields',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.storedFieldsDescription', {
      defaultMessage:
        'Heap memory used by Stored Fields (e.g., _source). This is a part of Lucene Total.',
    }),
  }),
  node_index_mem_term_vectors: new NodeIndexMemoryMetric({
    field: 'term_vectors_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.termVectorsLabel', {
      defaultMessage: 'Term Vectors',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.termVectorsDescription', {
      defaultMessage: 'Heap memory used by Term Vectors. This is a part of Lucene Total.',
    }),
  }),
  node_index_mem_terms: new NodeIndexMemoryMetric({
    field: 'terms_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.termsLabel', {
      defaultMessage: 'Terms',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.termsDescription', {
      defaultMessage: 'Heap memory used by Terms (e.g., text). This is a part of Lucene Total.',
    }),
  }),
  node_index_mem_versions: new NodeIndexMemoryMetric({
    field: 'version_map_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.versionMapLabel', {
      defaultMessage: 'Version Map',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.versionMapDescription', {
      defaultMessage:
        'Heap memory used by Versioning (e.g., updates and deletes). This is NOT a part of Lucene Total.',
    }),
  }),
  node_index_mem_writer: new NodeIndexMemoryMetric({
    field: 'index_writer_memory_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexWriterLabel', {
      defaultMessage: 'Index Writer',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.indexWriterDescription', {
      defaultMessage: 'Heap memory used by the Index Writer. This is NOT a part of Lucene Total.',
    }),
  }),
  node_index_threads_get_queue: new ElasticsearchMetric({
    field: 'node_stats.thread_pool.get.queue',
    title: nodeReadThreads,
    label: i18n.translate('xpack.monitoring.metrics.esNode.readThreads.getQueueLabel', {
      defaultMessage: 'GET Queue',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.readThreads.getQueueDescription', {
      defaultMessage: 'Number of GET operations in the queue.',
    }),
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    min: 0,
  }),
  node_index_threads_get_rejected: new ElasticsearchMetric({
    field: 'node_stats.thread_pool.get.rejected',
    title: nodeReadThreads,
    label: i18n.translate('xpack.monitoring.metrics.esNode.readThreads.getRejectionsLabel', {
      defaultMessage: 'GET Rejections',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.readThreads.getRejectionsDescription',
      {
        defaultMessage:
          'Number of GET operations that have been rejected, which occurs when the queue is full.',
      }
    ),
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    min: 0,
  }),
  node_index_threads_write_queue: new WriteThreadPoolQueueMetric({
    title: nodeIndexingThreads,
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexingThreads.writeQueueLabel', {
      defaultMessage: 'Write Queue',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.indexingThreads.writeQueueDescription',
      {
        defaultMessage:
          'Number of index, bulk, and write operations in the queue. ' +
          'The bulk threadpool was renamed to write in 6.3, and the index threadpool is deprecated.',
      }
    ),
  }),
  node_index_threads_write_rejected: new WriteThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.bulk.rejected',
    title: nodeIndexingThreads,
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexingThreads.writeRejectionsLabel', {
      defaultMessage: 'Write Rejections',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.indexingThreads.writeRejectionsDescription',
      {
        defaultMessage:
          'Number of index, bulk, and write operations that have been rejected, which occurs when the queue is full. ' +
          'The bulk threadpool was renamed to write in 6.3, and the index threadpool is deprecated.',
      }
    ),
  }),
  node_index_threads_search_queue: new ElasticsearchMetric({
    field: 'node_stats.thread_pool.search.queue',
    title: nodeReadThreads,
    label: i18n.translate('xpack.monitoring.metrics.esNode.readThreads.searchQueueLabel', {
      defaultMessage: 'Search Queue',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.readThreads.searchQueueDescription',
      {
        defaultMessage: 'Number of search operations in the queue (e.g., shard level searches).',
      }
    ),
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    min: 0,
  }),
  node_index_threads_search_rejected: new ElasticsearchMetric({
    field: 'node_stats.thread_pool.search.rejected',
    title: nodeReadThreads,
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexingThreads.searchRejectionsLabel', {
      defaultMessage: 'Search Rejections',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.indexingThreads.searchRejectionsDescription',
      {
        defaultMessage:
          'Number of search operations that have been rejected, which occurs when the queue is full.',
      }
    ),
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    min: 0,
  }),
  node_index_total: new ElasticsearchMetric({
    field: 'node_stats.indices.indexing.index_total',
    title: i18n.translate('xpack.monitoring.metrics.esNode.requestRateTitle', {
      defaultMessage: 'Request Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esNode.requestRate.indexingTotalLabel', {
      defaultMessage: 'Indexing Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.requestRate.indexingTotalDescription',
      {
        defaultMessage: 'Amount of indexing operations.',
      }
    ),
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  node_index_time: new ElasticsearchMetric({
    field: 'node_stats.indices.indexing.index_time_in_millis',
    title: i18n.translate('xpack.monitoring.metrics.esNode.indexingTimeTitle', {
      defaultMessage: 'Indexing Time',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexingTime.indexTimeLabel', {
      defaultMessage: 'Index Time',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.indexingTime.indexTimeDescription',
      {
        defaultMessage: 'Amount of time spent on indexing operations.',
      }
    ),
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  node_free_space: new ElasticsearchMetric({
    field: 'node_stats.fs.total.available_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.diskFreeSpaceLabel', {
      defaultMessage: 'Disk Free Space',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.diskFreeSpaceDescription', {
      defaultMessage: 'Free disk space available on the node.',
    }),
    type: 'node',
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: '',
  }),
  node_search_total: new ElasticsearchMetric({
    field: 'node_stats.indices.search.query_total',
    title: i18n.translate('xpack.monitoring.metrics.esNode.requestRateTitle', {
      defaultMessage: 'Request Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esNode.requestRate.searchTotalLabel', {
      defaultMessage: 'Search Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.requestRate.searchTotalDescription',
      {
        defaultMessage: 'Amount of search operations (per shard).',
      }
    ),
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  node_threads_queued_bulk: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.bulk.queue',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsQueued.bulkLabel', {
      defaultMessage: 'Bulk',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.threadsQueued.bulkDescription', {
      defaultMessage:
        'Number of bulk indexing operations waiting to be processed on this node. A single bulk request can create multiple bulk operations.',
    }),
  }),
  node_threads_queued_generic: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.generic.queue',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsQueued.genericLabel', {
      defaultMessage: 'Generic',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.threadsQueued.genericDescription',
      {
        defaultMessage:
          'Number of generic (internal) operations waiting to be processed on this node.',
      }
    ),
  }),
  node_threads_queued_get: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.get.queue',
    title: i18n.translate('xpack.monitoring.metrics.esNode.threadQueueTitle', {
      defaultMessage: 'Thread Queue',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadQueue.getLabel', {
      defaultMessage: 'Get',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.threadQueue.getDescription', {
      defaultMessage: 'Number of get operations waiting to be processed on this node.',
    }),
  }),
  node_threads_queued_index: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.index.queue',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsQueued.indexLabel', {
      defaultMessage: 'Index',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.threadsQueued.indexDescription', {
      defaultMessage: 'Number of non-bulk, index operations waiting to be processed on this node.',
    }),
  }),
  node_threads_queued_management: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.management.queue',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsQueued.managementLabel', {
      defaultMessage: 'Management',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.threadsQueued.managementDescription',
      {
        defaultMessage:
          'Number of management (internal) operations waiting to be processed on this node.',
      }
    ),
  }),
  node_threads_queued_search: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.search.queue',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsQueued.searchLabel', {
      defaultMessage: 'Search',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.threadsQueued.searchDescription', {
      defaultMessage:
        'Number of search operations waiting to be processed on this node. A single search request can create multiple search operations.',
    }),
  }),
  node_threads_queued_watcher: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.watcher.queue',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsQueued.watcherLabel', {
      defaultMessage: 'Watcher',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.threadsQueued.watcherDescription',
      {
        defaultMessage: 'Number of Watcher operations waiting to be processed on this node.',
      }
    ),
  }),
  node_threads_rejected_bulk: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.bulk.rejected',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsRejected.bulkLabel', {
      defaultMessage: 'Bulk',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.threadsRejected.bulkDescription', {
      defaultMessage: 'Bulk rejections. These occur when the queue is full.',
    }),
  }),
  node_threads_rejected_generic: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.generic.rejected',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsRejected.genericLabel', {
      defaultMessage: 'Generic',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.threadsRejected.genericDescription',
      {
        defaultMessage: 'Generic (internal) rejections. These occur when the queue is full.',
      }
    ),
  }),
  node_threads_rejected_get: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.get.rejected',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsRejected.getLabel', {
      defaultMessage: 'Get',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.threadsRejected.getDescription', {
      defaultMessage: 'Get rejections. These occur when the queue is full.',
    }),
  }),
  node_threads_rejected_index: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.index.rejected',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsRejected.indexLabel', {
      defaultMessage: 'Index',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.threadsRejected.indexDescription',
      {
        defaultMessage:
          'Index rejections. These occur when the queue is full. You should look at bulk indexing.',
      }
    ),
  }),
  node_threads_rejected_management: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.management.rejected',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsRejected.managementLabel', {
      defaultMessage: 'Management',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.threadsRejected.managementDescription',
      {
        defaultMessage: 'Get (internal) rejections. These occur when the queue is full.',
      }
    ),
  }),
  node_threads_rejected_search: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.search.rejected',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsRejected.searchLabel', {
      defaultMessage: 'Search',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.threadsRejected.searchDescription',
      {
        defaultMessage:
          'Search rejections. These occur when the queue is full. This can indicate over-sharding.',
      }
    ),
  }),
  node_threads_rejected_watcher: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.watcher.rejected',
    label: i18n.translate('xpack.monitoring.metrics.esNode.threadsRejected.watcherLabel', {
      defaultMessage: 'Watcher',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.threadsRejected.watcherDescription',
      {
        defaultMessage:
          'Watch rejections. These occur when the queue is full. This can indicate stuck-Watches.',
      }
    ),
  }),
  node_throttle_index_time: new ElasticsearchMetric({
    field: 'node_stats.indices.indexing.throttle_time_in_millis',
    title: i18n.translate('xpack.monitoring.metrics.esNode.indexingTimeTitle', {
      defaultMessage: 'Indexing Time',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexingTime.indexThrottlingTimeLabel', {
      defaultMessage: 'Index Throttling Time',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.indexingTime.indexThrottlingTimeDescription',
      {
        defaultMessage:
          'Amount of time spent with index throttling, which indicates slow disks on a node.',
      }
    ),
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
    min: 0,
  }),
  index_throttle_time: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.throttle_time_in_millis',
    label: i18n.translate('xpack.monitoring.metrics.esNode.indexThrottlingTimeLabel', {
      defaultMessage: 'Index Throttling Time',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.indexThrottlingTimeDescription', {
      defaultMessage: 'Amount of time spent with index throttling, which indicates slow merging.',
    }),
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  index_document_count: new ElasticsearchMetric({
    field: 'index_stats.primaries.docs.count',
    label: i18n.translate('xpack.monitoring.metrics.esNode.documentCountLabel', {
      defaultMessage: 'Document Count',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.documentCountDescription', {
      defaultMessage: 'Total number of documents, only including primary shards.',
    }),
    type: 'index',
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    units: '',
  }),
  index_search_request_rate: new RequestRateMetric({
    field: 'index_stats.total.search.query_total',
    title: i18n.translate('xpack.monitoring.metrics.esNode.searchRateTitle', {
      defaultMessage: 'Search Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.esNode.searchRate.totalShardsLabel', {
      defaultMessage: 'Total Shards',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.esNode.searchRate.totalShardsDescription',
      {
        defaultMessage:
          'Number of search requests being executed across primary and replica shards. A single search can run against multiple shards!',
      }
    ),
    type: 'index',
  }),
  index_merge_rate: new RequestRateMetric({
    field: 'index_stats.total.merges.total_size_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.esNode.mergeRateLabel', {
      defaultMessage: 'Merge Rate',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.mergeRateDescription', {
      defaultMessage:
        'Amount in bytes of merged segments. Larger numbers indicate heavier disk activity.',
    }),
    type: 'index',
  }),
  index_refresh_time: new ElasticsearchMetric({
    field: 'index_stats.total.refresh.total_time_in_millis',
    label: i18n.translate('xpack.monitoring.metrics.esNode.totalRefreshTimeLabel', {
      defaultMessage: 'Total Refresh Time',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esNode.totalRefreshTimeDescription', {
      defaultMessage: 'Time spent on Elasticsearch refresh for primary and replica shards.',
    }),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    type: 'index',
    derivative: true,
  }),

  // CCR
  ccr_sync_lag_time: new MillisecondsToSecondsMetric({
    title: i18n.translate('xpack.monitoring.metrics.esCcr.fetchDelayTitle', {
      defaultMessage: 'Fetch delay', // title to use for the chart
    }),
    type: 'ccr',
    field: 'ccr_stats.time_since_last_read_millis',
    label: i18n.translate('xpack.monitoring.metrics.esCcr.fetchDelayLabel', {
      defaultMessage: 'Fetch delay',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esCcr.fetchDelayDescription', {
      defaultMessage: 'The amount of time the follower index is lagging behind the leader.',
    }),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  ccr_sync_lag_ops: new DifferenceMetric({
    title: i18n.translate('xpack.monitoring.metrics.esCcr.opsDelayTitle', {
      defaultMessage: 'Ops delay', // title to use for the chart
    }),
    type: 'ccr',
    fieldSource: 'ccr_stats',
    metric: 'leader_max_seq_no',
    metric2: 'follower_global_checkpoint',
    label: i18n.translate('xpack.monitoring.metrics.esCcr.opsDelayLabel', {
      defaultMessage: 'Ops delay',
    }),
    description: i18n.translate('xpack.monitoring.metrics.esCcr.opsDelayDescription', {
      defaultMessage: 'The number of operations the follower index is lagging behind the leader.',
    }),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
};
