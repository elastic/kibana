/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createQuery } from './create_query';
import { mapToList } from './get_high_level_stats';
import { incrementByKey } from './get_high_level_stats';
import {
  TELEMETRY_QUERY_SOURCE,
  INDEX_PATTERN_LOGSTASH_MONITORING,
  INDEX_PATTERN_LOGSTASH_STACK_MONITORING_STATE,
  INDEX_PATTERN_LOGSTASH_STACK_MONITORING_STATS,
} from '../../common/constants';
import {
  HITS_SIZE,
  getLogstashBaseStats,
  Counter,
  LogstashMonitoring,
  LogstashProcessOptions,
  LogstashState,
  LogstashStats,
  LogstashStatsByClusterUuid,
} from './logstash_monitoring';

export class LogstashMetricbeatMonitoring implements LogstashMonitoring {
  private indexPattern: { [key: string]: string } = {
    state: INDEX_PATTERN_LOGSTASH_STACK_MONITORING_STATE,
    stats: INDEX_PATTERN_LOGSTASH_STACK_MONITORING_STATS,
  };

  /*
   * Call the function for fetching and summarizing Logstash metrics for Metricbeat monitoring
   * @param {Object} callCluster - ES client
   * @param {Array} clusterUuids - List cluster UUIDs to retrieve metrics
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   * @param {string} start - start timestamp
   * @param {string} end - end timestamp
   * @param {Object} options - additional processing required options
   * @return {Object} - Logstash stats in an object keyed by the cluster UUIDs
   * Note that, we try to fetch all metrics for the given time regardless of the cluster UUID
   * If metrics do not have UUID, metrics will be included in the monitoring cluster UUID
   */
  async collectMetrics(
    callCluster: ElasticsearchClient,
    clusterUuids: string[],
    monitoringClusterUuid: string,
    start: string,
    end: string,
    options: LogstashProcessOptions
  ): Promise<LogstashStatsByClusterUuid> {
    await this.fetchLogstashStats(callCluster, monitoringClusterUuid, start, end, options);

    const allEphemeralIds = Object.values(options.allEphemeralIds).flat();
    if (allEphemeralIds.length > 0) {
      await this.fetchLogstashState(callCluster, monitoringClusterUuid, allEphemeralIds, options);
    }
    return options.clusters;
  }

  /*
   * Sets the index patterns based on the metricbeat monitoring types: [legacy, stack]
   * @param monitoringType - the monitoring type where metricbeat monitoring is intended.
   */
  setIndexPattern(monitoringType: string) {
    if (monitoringType === 'stack') {
      this.indexPattern.state = INDEX_PATTERN_LOGSTASH_STACK_MONITORING_STATE;
      this.indexPattern.stats = INDEX_PATTERN_LOGSTASH_STACK_MONITORING_STATS;
    } else {
      this.indexPattern.state = INDEX_PATTERN_LOGSTASH_MONITORING;
      this.indexPattern.stats = INDEX_PATTERN_LOGSTASH_MONITORING;
    }
  }

  getIndexPattern(): { [key: string]: string } {
    return this.indexPattern;
  }
  /*
   * Update a clusters object with processed Logstash stats for metricbeat monitoring
   * @param {Array} results - array of LogstashStats docs from ES
   * @param {Object} clusters - LogstashBaseStats in an object keyed by the cluster UUIDs
   * @param {Object} allEphemeralIds - EphemeralIds in an object keyed by cluster UUIDs to track the pipelines for the cluster
   * @param {Object} versions - Versions in an object keyed by cluster UUIDs to track the logstash versions for the cluster
   * @param {Object} plugins - plugin information keyed by cluster UUIDs to count the unique plugins
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   */
  private processStatsResults(
    results: estypes.SearchResponse<LogstashStats>,
    { clusters, allEphemeralIds, versions, plugins }: LogstashProcessOptions,
    monitoringClusterUuid: string
  ) {
    const currHits = results?.hits?.hits || [];
    currHits.forEach((hit) => {
      // consider orphan case as well
      // orphan case: where pipeline doesn't set cluster UUID or es-output plugin isn't in pipeline.
      const clusterUuid =
        hit._source!.logstash?.elasticsearch?.cluster?.id || monitoringClusterUuid;

      if (clusterUuid !== undefined && clusters[clusterUuid] === undefined) {
        clusters[clusterUuid] = getLogstashBaseStats();
        versions[clusterUuid] = new Map();
        plugins[clusterUuid] = new Map();
      }
      const logstashStats = hit._source?.logstash?.node?.stats;

      if (clusterUuid !== undefined && logstashStats !== undefined) {
        const clusterStats = clusters[clusterUuid].cluster_stats || {};
        clusterStats.monitoringClusterUuid = monitoringClusterUuid;
        clusters[clusterUuid].count = (clusters[clusterUuid].count || 0) + 1;

        const thisVersion = logstashStats.logstash?.version;
        const a: Counter = versions[clusterUuid];
        incrementByKey(a, thisVersion);
        clusters[clusterUuid].versions = mapToList(a, 'version');

        const thisCollectionType = hit._source?.agent?.type || 'metricbeat';
        if (!Object.hasOwn(clusterStats, 'collection_types')) {
          clusterStats.collection_types = {};
        }
        clusterStats.collection_types![thisCollectionType] =
          (clusterStats.collection_types![thisCollectionType] || 0) + 1;
        const pipelines = logstashStats.pipelines || [];

        pipelines.forEach((pipeline) => {
          const thisQueueType = pipeline.queue?.type;
          if (thisQueueType !== undefined) {
            if (!Object.hasOwn(clusterStats, 'queues')) {
              clusterStats.queues = {};
            }
            clusterStats.queues![thisQueueType] = (clusterStats.queues![thisQueueType] || 0) + 1;
          }

          const ephemeralId = pipeline.ephemeral_id;
          if (ephemeralId !== undefined) {
            allEphemeralIds[clusterUuid] = allEphemeralIds[clusterUuid] || [];
            allEphemeralIds[clusterUuid].push(ephemeralId);
          }
        });
      }
    });
  }

  /*
   * Update a clusters object with logstash state details
   * @param {Array} results - array of LogstashState docs from ES
   * @param {Object} clusters - LogstashBaseStats in an object keyed by the cluster UUIDs
   * @param {Object} plugins - plugin information keyed by cluster UUIDs to count the unique plugins
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   */
  private processStateResults(
    results: estypes.SearchResponse<LogstashState>,
    { clusters, plugins }: LogstashProcessOptions,
    monitoringClusterUuid: string
  ) {
    const currHits = results?.hits?.hits || [];
    currHits.forEach((hit) => {
      const clusterUuid =
        hit._source?.logstash?.elasticsearch?.cluster?.id || monitoringClusterUuid;
      const pipelineStats = clusters[clusterUuid]?.cluster_stats?.pipelines;
      const thisLogstashStatePipeline = hit._source?.logstash?.node?.state?.pipeline;

      if (pipelineStats !== undefined && thisLogstashStatePipeline !== undefined) {
        pipelineStats.count = (pipelineStats.count || 0) + 1;

        const thisPipelineBatchSize = thisLogstashStatePipeline.batch_size;

        if (thisPipelineBatchSize !== undefined) {
          pipelineStats.batch_size_total =
            (pipelineStats.batch_size_total || 0) + thisPipelineBatchSize;
          pipelineStats.batch_size_max = pipelineStats.batch_size_max || 0;
          pipelineStats.batch_size_min = pipelineStats.batch_size_min || 0;
          pipelineStats.batch_size_avg = pipelineStats.batch_size_total / pipelineStats.count;

          if (thisPipelineBatchSize > pipelineStats.batch_size_max) {
            pipelineStats.batch_size_max = thisPipelineBatchSize;
          }
          if (
            pipelineStats.batch_size_min === 0 ||
            thisPipelineBatchSize < pipelineStats.batch_size_min
          ) {
            pipelineStats.batch_size_min = thisPipelineBatchSize;
          }
        }

        const thisPipelineWorkers = thisLogstashStatePipeline.workers;
        if (thisPipelineWorkers !== undefined) {
          pipelineStats.workers_total = (pipelineStats.workers_total || 0) + thisPipelineWorkers;
          pipelineStats.workers_max = pipelineStats.workers_max || 0;
          pipelineStats.workers_min = pipelineStats.workers_min || 0;
          pipelineStats.workers_avg = pipelineStats.workers_total / pipelineStats.count;

          if (thisPipelineWorkers > pipelineStats.workers_max) {
            pipelineStats.workers_max = thisPipelineWorkers;
          }
          if (pipelineStats.workers_min === 0 || thisPipelineWorkers < pipelineStats.workers_min) {
            pipelineStats.workers_min = thisPipelineWorkers;
          }
        }

        // Extract the vertices object from the pipeline representation. From this, we can
        // retrieve the source of the pipeline element on the configuration(from file, string, or
        // x-pack-config-management), and the input, filter and output plugins from that pipeline.
        const vertices = thisLogstashStatePipeline.representation?.graph?.vertices;

        if (vertices !== undefined) {
          vertices.forEach((vertex) => {
            const configName = vertex.config_name;
            const pluginType = vertex.plugin_type;
            let pipelineConfig = vertex.meta?.source?.protocol;

            if (pipelineConfig !== undefined) {
              if (pipelineConfig === 'string' || pipelineConfig === 'str') {
                pipelineConfig = 'string';
              } else if (pipelineConfig === 'x-pack-config-management') {
                pipelineConfig = 'xpack';
              } else {
                pipelineConfig = 'file';
              }
              if (!Object.hasOwn(pipelineStats, 'sources')) {
                pipelineStats.sources = {};
              }
              pipelineStats.sources![pipelineConfig] = true;
            }
            if (configName !== undefined && pluginType !== undefined) {
              incrementByKey(plugins[clusterUuid], `logstash-${pluginType}-${configName}`);
            }
          });
        }

        const clusterStats = clusters[clusterUuid]?.cluster_stats;
        if (clusterStats !== undefined) {
          clusterStats.plugins = mapToList(plugins[clusterUuid], 'name');
        }
      }
    });
  }

  /*
   * Creates a query and executes against ES to fetch metricbeat monitoring, Logstash stats metrics
   * @param {Object} callCluster - ES client
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   * @param {string} start - start timestamp
   * @param {string} end - end timestamp
   * @param {Object} options - additional processing required options
   */
  private async fetchLogstashStats(
    callCluster: ElasticsearchClient,
    monitoringClusterUuid: string,
    start: string,
    end: string,
    { page = 0, ...options }: { page?: number } & LogstashProcessOptions
  ): Promise<void> {
    const filterPath: string[] = [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.type',
      'hits.hits._source.source_node',
      'hits.hits._source.agent.type',
      'hits.hits._source.logstash.elasticsearch.cluster.id', // alias for cluster_uuid
      'hits.hits._source.logstash.node.stats.pipelines.id',
      'hits.hits._source.logstash.node.stats.pipelines.ephemeral_id',
      'hits.hits._source.logstash.node.stats.pipelines.queue.type',
      'hits.hits._source.logstash.node.stats.logstash.version',
      'hits.hits._source.logstash.node.stats.logstash.uuid',
    ];

    const params: estypes.SearchRequest = {
      index: this.indexPattern.stats,
      ignore_unavailable: true,
      filter_path: filterPath,
      body: {
        query: createQuery({
          start,
          end,
          filters: [
            {
              bool: {
                should: [
                  { term: { 'metricset.name': 'node_stats' } },
                  { term: { 'data_stream.dataset': 'logstash.stack_monitoring.node_stats' } },
                ],
              },
            },
          ],
        }) as estypes.QueryDslQueryContainer,
        collapse: {
          field: 'logstash.node.stats.logstash.uuid',
        },
        sort: [{ ['timestamp']: { order: 'desc', unmapped_type: 'long' } }],
        from: page * HITS_SIZE,
        size: HITS_SIZE,
      },
    };

    const results = await callCluster.search<LogstashStats>(params, {
      headers: {
        'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
      },
    });
    const hitsLength = results?.hits?.hits.length || 0;

    if (hitsLength > 0) {
      // further augment the clusters object with more stats
      this.processStatsResults(results, options, monitoringClusterUuid);
    }
    return Promise.resolve();
  }

  /*
   * Creates a query and executes against ES to fetch metricbeat monitoring, Logstash state metrics
   * @param {Object} callCluster - ES client
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   * @param {Array} ephemeralIds - Logstash pipeline ephemeral IDs
   * @param {string} start - start timestamp
   * @param {string} end - end timestamp
   * @param {Object} options - additional processing required options
   */
  private async fetchLogstashState(
    callCluster: ElasticsearchClient,
    monitoringClusterUuid: string,
    ephemeralIds: string[],
    { page = 0, ...options }: { page?: number } & LogstashProcessOptions
  ): Promise<void> {
    const filterPath: string[] = [
      'hits.hits._source.logstash.node.state.pipeline.batch_size',
      'hits.hits._source.logstash.node.state.pipeline.workers',
      'hits.hits._source.logstash.node.state.pipeline.representation.graph.vertices',
      'hits.hits._source.type',
    ];

    const params: estypes.SearchRequest = {
      index: this.indexPattern.state,
      ignore_unavailable: true,
      filter_path: filterPath,
      body: {
        query: createQuery({
          // metricbeat occasionally sends state metrics
          // so, not using start and end periods as we need node state info to fill plugin usages
          filters: [
            { terms: { 'logstash.node.state.pipeline.ephemeral_id': ephemeralIds } },
            {
              bool: {
                should: [
                  { term: { 'metricset.name': 'node' } },
                  { term: { 'data_stream.dataset': 'logstash.stack_monitoring.node' } },
                ],
              },
            },
          ],
        }) as estypes.QueryDslQueryContainer,
        collapse: {
          field: 'logstash.node.state.pipeline.ephemeral_id',
        },
        sort: [{ ['timestamp']: { order: 'desc', unmapped_type: 'long' } }],
        size: ephemeralIds.length,
      },
    };

    const results = await callCluster.search<LogstashState>(params, {
      headers: {
        'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
      },
    });

    const hitsLength = results?.hits?.hits.length || 0;
    if (hitsLength > 0) {
      // further augment the clusters object with more stats
      this.processStateResults(results, options, monitoringClusterUuid);
    }
    return Promise.resolve();
  }
}
