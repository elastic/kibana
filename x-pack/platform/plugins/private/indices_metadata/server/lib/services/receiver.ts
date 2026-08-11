/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, LogMeta, Logger } from '@kbn/core/server';
import type {
  IlmExplainLifecycleRequest,
  IlmGetLifecycleRequest,
  IndicesGetDataStreamRequest,
  IndicesGetIndexTemplateRequest,
  IndicesGetRequest,
  IndicesStatsRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  DataStream,
  IlmPhase,
  IlmPhases,
  IlmPolicy,
  IlmStats,
  Index,
  IndexSettings,
  IndexStats,
  IndexTemplateInfo,
} from './indices_metadata.types';
import { chunkedBy } from '../utils';

interface MeteringIndexData {
  name: string;
  num_docs: number;
  size_in_bytes: number;
}

interface MeteringStatsResponse {
  datastreams: Array<MeteringIndexData>;
  indices: Array<MeteringIndexData>;
}

export class MetadataReceiver {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly isServerless: boolean
  ) {
    this.logger = logger.get(MetadataReceiver.name);
  }

  public async getIndices(): Promise<IndexSettings[]> {
    this.logger.debug('Fetching indices');

    const request: IndicesGetRequest = {
      index: '*',
      expand_wildcards: ['open', 'hidden'],
      filter_path: [
        '*.mappings._source.mode',
        '*.settings.index.default_pipeline',
        '*.settings.index.final_pipeline',
        '*.settings.index.mode',
        '*.settings.index.provided_name',
      ],
    };

    return this.esClient.indices
      .get(request)
      .then((indices) =>
        Object.entries(indices ?? {}).map(([index, value]) => {
          return {
            index_name: index,
            default_pipeline: value.settings?.index?.default_pipeline,
            final_pipeline: value.settings?.index?.final_pipeline,
            index_mode: value.settings?.index?.mode,
            source_mode: value.mappings?._source?.mode,
          } as IndexSettings;
        })
      )
      .catch((error) => {
        this.logger.warn('Error fetching indices', { error });
        throw error;
      });
  }

  public async getDataStreams(): Promise<DataStream[]> {
    this.logger.debug('Fetching datstreams');

    const request: IndicesGetDataStreamRequest = {
      name: '*',
      expand_wildcards: ['open', 'hidden'],
      filter_path: [
        'data_streams.name',
        'data_streams.indices',
        'data_streams.lifecycle.enabled',
        'data_streams.lifecycle.data_retention',
      ],
    };

    return this.esClient.indices
      .getDataStream(request)
      .then((response) => {
        const streams = response.data_streams ?? [];
        return streams.map((ds) => {
          const dsl = ds.lifecycle;
          return {
            datastream_name: ds.name,
            dsl: {
              enabled: dsl?.enabled ?? false,
              data_retention: dsl?.data_retention,
            },
            indices:
              ds.indices?.map((index) => {
                return {
                  index_name: index.index_name,
                  ilm_policy: index.ilm_policy,
                } as Index;
              }) ?? [],
          } as DataStream;
        });
      })
      .catch((error) => {
        this.logger.error('Error fetching datastreams', { error });
        throw error;
      });
  }

  public async *getIndicesStats(indices: string[], chunkSize: number) {
    const safeChunkSize = Math.min(chunkSize, 3000);

    this.logger.debug('Fetching indices stats');

    const groupedIndices = this.chunkStringsByMaxLength(indices, safeChunkSize);

    this.logger.debug('Splitted indices into groups', {
      groups: groupedIndices.length,
      indices: indices.length,
    } as LogMeta);

    for (const group of groupedIndices) {
      const request: IndicesStatsRequest = {
        index: group,
        level: 'indices',
        metric: ['docs', 'search', 'store'],
        expand_wildcards: ['open', 'hidden'],
        filter_path: [
          'indices.*.total.search.query_total',
          'indices.*.total.search.query_time_in_millis',

          'indices.*.total.docs.count',
          'indices.*.total.docs.deleted',
          'indices.*.total.store.size_in_bytes',

          'indices.*.primaries.docs.count',
          'indices.*.primaries.docs.deleted',
          'indices.*.primaries.store.size_in_bytes',

          'indices.*.total.indexing.index_failed',
          'indices.*.total.indexing.index_failed_due_to_version_conflict',
        ],
      };

      try {
        const response = await this.esClient.indices.stats(request);

        let meteringStats: Map<string, MeteringIndexData> | undefined;
        if (this.isServerless) {
          meteringStats = await this.esClient.transport
            .request<MeteringStatsResponse>({
              method: 'GET',
              path: `/_metering/stats/${group}`,
            })
            .then((res) => {
              return res.indices.reduce((map, index) => {
                map.set(index.name, index);
                return map;
              }, new Map<string, MeteringIndexData>());
            })
            .catch((error) => {
              this.logger.error('Error fetching metering stats', { error });
              return new Map<string, MeteringIndexData>();
            });
        }

        for (const [indexName, stats] of Object.entries(response.indices ?? {})) {
          const meteringData = meteringStats?.get(indexName);

          let docsCount = stats.primaries?.docs?.count;
          let sizeInBytes = stats.primaries?.store?.size_in_bytes;

          if (meteringData) {
            if (meteringData.num_docs !== docsCount || meteringData.size_in_bytes !== sizeInBytes) {
              this.logger.debug('Metering stats differ from regular stats', {
                index: indexName,
                metering: {
                  num_docs: meteringData.num_docs,
                  size_in_bytes: meteringData.size_in_bytes,
                },
                regular: { docs_count: docsCount, size_in_bytes: sizeInBytes },
              } as LogMeta);
            }
            docsCount = meteringData.num_docs;
            sizeInBytes = meteringData.size_in_bytes;
          }

          yield {
            index_name: indexName,
            query_total: stats.total?.search?.query_total,
            query_time_in_millis: stats.total?.search?.query_time_in_millis,

            docs_count: docsCount,
            docs_deleted: stats.total?.docs?.deleted,
            docs_total_size_in_bytes: sizeInBytes,

            index_failed: stats.total?.indexing?.index_failed,
            index_failed_due_to_version_conflict: (stats.total?.indexing as any)
              ?.index_failed_due_to_version_conflict,

            docs_count_primaries: docsCount,
            docs_deleted_primaries: stats.primaries?.docs?.deleted,
            docs_total_size_in_bytes_primaries: sizeInBytes,
          } as IndexStats;
        }
      } catch (error) {
        this.logger.error('Error fetching indices stats', { error });
        throw error;
      }
    }
  }

  public async isIlmStatsAvailable() {
    const request: IlmExplainLifecycleRequest = {
      index: '-invalid-index',
      only_managed: false,
      filter_path: ['indices.*.phase', 'indices.*.age', 'indices.*.policy'],
    };

    const result = await this.esClient.ilm
      .explainLifecycle(request)
      .then(() => {
        return true;
      })
      .catch((error) => {
        return error.meta.statusCode === 404;
      });

    return result;
  }

  public async *getIlmsStats(indices: string[]) {
    const groupedIndices = this.chunkStringsByMaxLength(indices);

    this.logger.debug('Splitted ilms into groups', {
      groups: groupedIndices.length,
      indices: indices.length,
    } as LogMeta);

    for (const group of groupedIndices) {
      const request: IlmExplainLifecycleRequest = {
        index: group.join(','),
        only_managed: false,
        filter_path: ['indices.*.phase', 'indices.*.age', 'indices.*.policy'],
      };

      const data = await this.esClient.ilm.explainLifecycle(request);

      try {
        for (const [indexName, stats] of Object.entries(data.indices ?? {})) {
          const entry = {
            index_name: indexName,
            phase: ('phase' in stats && stats.phase) || undefined,
            age: ('age' in stats && stats.age) || undefined,
            policy_name: ('policy' in stats && stats.policy) || undefined,
          } as IlmStats;

          yield entry;
        }
      } catch (error) {
        this.logger.error('Error fetching ilm stats', { error });
        throw error;
      }
    }
  }

  public async getIndexTemplatesStats(): Promise<IndexTemplateInfo[]> {
    this.logger.debug('Fetching index templates');

    const request: IndicesGetIndexTemplateRequest = {
      name: '*',
      filter_path: [
        'index_templates.name',
        'index_templates.index_template.template.settings.index.mode',
        'index_templates.index_template.data_stream',
        'index_templates.index_template._meta.package.name',
        'index_templates.index_template._meta.managed_by',
        'index_templates.index_template._meta.beat',
        'index_templates.index_template._meta.managed',
        'index_templates.index_template.composed_of',
        'index_templates.index_template.template.mappings._source.enabled',
        'index_templates.index_template.template.mappings._source.includes',
        'index_templates.index_template.template.mappings._source.excludes',
      ],
    };

    return this.esClient.indices
      .getIndexTemplate(request)
      .then((response) => {
        const templates = response.index_templates ?? [];
        return templates.map((props) => {
          const datastream = props.index_template?.data_stream !== undefined;
          return {
            template_name: props.name,
            index_mode: props.index_template.template?.settings?.index?.mode,
            package_name: props.index_template._meta?.package?.name,
            datastream,
            managed_by: props.index_template._meta?.managed_by,
            beat: props.index_template._meta?.beat,
            is_managed: props.index_template._meta?.managed,
            composed_of: props.index_template.composed_of,
            source_enabled: props.index_template.template?.mappings?._source?.enabled,
            source_includes: props.index_template.template?.mappings?._source?.includes ?? [],
            source_excludes: props.index_template.template?.mappings?._source?.excludes ?? [],
          } as IndexTemplateInfo;
        });
      })
      .catch((error) => {
        this.logger.warn('Error fetching index templates', { error });
        throw error;
      });
  }

  public async *getIlmsPolicies(ilms: string[], chunkSize: number) {
    const safeChunkSize = Math.min(chunkSize, 3000);

    const phase = (obj: unknown): IlmPhase | null | undefined => {
      let value: IlmPhase | null | undefined;
      if (obj !== null && obj !== undefined && typeof obj === 'object' && 'min_age' in obj) {
        value = {
          min_age: obj.min_age,
        } as IlmPhase;
      }
      return value;
    };

    const groupedIlms = this.chunkStringsByMaxLength(ilms, safeChunkSize);

    this.logger.debug('Splitted ilms into groups', {
      groups: groupedIlms.length,
      ilms: ilms.length,
    } as LogMeta);

    for (const group of groupedIlms) {
      this.logger.debug('Fetching ilm policies');
      const request: IlmGetLifecycleRequest = {
        name: group.join(','),
        filter_path: [
          '*.policy.phases.cold.min_age',
          '*.policy.phases.delete.min_age',
          '*.policy.phases.frozen.min_age',
          '*.policy.phases.hot.min_age',
          '*.policy.phases.warm.min_age',
          '*.modified_date',
        ],
      };

      const response = await this.esClient.ilm.getLifecycle(request);
      try {
        for (const [policyName, stats] of Object.entries(response ?? {})) {
          yield {
            policy_name: policyName,
            modified_date: stats.modified_date,
            phases: {
              cold: phase(stats.policy.phases.cold),
              delete: phase(stats.policy.phases.delete),
              frozen: phase(stats.policy.phases.frozen),
              hot: phase(stats.policy.phases.hot),
              warm: phase(stats.policy.phases.warm),
            } as IlmPhases,
          } as IlmPolicy;
        }
      } catch (error) {
        this.logger.error('Error fetching ilm policies', { error });
        throw error;
      }
    }
  }

  private chunkStringsByMaxLength(strings: string[], maxLength: number = 3072): string[][] {
    // plus 1 for the comma separator
    return chunkedBy(strings, maxLength, (index) => index.length + 1);
  }
}
