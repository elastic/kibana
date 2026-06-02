/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, LogMeta, Logger } from '@kbn/core/server';
import {
  SIGNAL_INDICES,
  TERMS_AGG_SIZE,
  SCOPE_NAMES_AGG_SIZE,
  SAMPLER_SHARD_SIZE,
  SAMPLER_MAX_DOCS_PER_VALUE,
} from '../constants';
import type { SignalType, OtelTelemetryConfiguration } from '../constants';

export interface CompositeBucketKey {
  service_name: string;
  environment: string | null;
}

interface TermsBucket {
  key: string;
  doc_count: number;
}

interface FilterAgg {
  doc_count: number;
}

interface SampledAggs {
  sdk_names: { buckets: TermsBucket[] };
  sdk_languages: { buckets: TermsBucket[] };
  sdk_versions: { buckets: TermsBucket[] };
  distro_names: { buckets: TermsBucket[] };
  distro_versions: { buckets: TermsBucket[] };
  cloud_providers: { buckets: TermsBucket[] };
  cloud_platforms: { buckets: TermsBucket[] };
  cloud_regions: { buckets: TermsBucket[] };
  cloud_az: { buckets: TermsBucket[] };
  host_archs: { buckets: TermsBucket[] };
  os_types: { buckets: TermsBucket[] };
  os_names: { buckets: TermsBucket[] };
  os_versions: { buckets: TermsBucket[] };
  os_descriptions: { buckets: TermsBucket[] };
  device_manufacturers: { buckets: TermsBucket[] };
  device_model_names: { buckets: TermsBucket[] };
  browser_platforms: { buckets: TermsBucket[] };
  user_agent_originals: { buckets: TermsBucket[] };
  runtime_names: { buckets: TermsBucket[] };
  runtime_versions: { buckets: TermsBucket[] };
  runtime_descriptions: { buckets: TermsBucket[] };
  executable_names: { buckets: TermsBucket[] };
  webengine_names: { buckets: TermsBucket[] };
  webengine_versions: { buckets: TermsBucket[] };
  webengine_descriptions: { buckets: TermsBucket[] };
  scope_names: { buckets: TermsBucket[] };
  upstream_cluster: { buckets: TermsBucket[] };
}

export interface CompositeBucket {
  key: CompositeBucketKey;
  doc_count: number;
  sample: SampledAggs;
  has_k8s: FilterAgg;
  has_container: FilterAgg;
}

interface CompositeResponse {
  aggregations?: {
    combos: {
      after_key?: Record<string, unknown>;
      buckets: CompositeBucket[];
    };
  };
}

export class OtelTelemetryReceiver {
  private readonly logger: Logger;

  constructor(logger: Logger, private readonly esClient: ElasticsearchClient) {
    this.logger = logger.get(OtelTelemetryReceiver.name);
  }

  public async fetchAllSignals(
    config: OtelTelemetryConfiguration,
    abortSignal?: AbortSignal
  ): Promise<Record<SignalType, CompositeBucket[]>> {
    const result: Record<SignalType, CompositeBucket[]> = {
      traces: [],
      metrics: [],
      logs: [],
    };

    for (const signal of Object.keys(SIGNAL_INDICES) as SignalType[]) {
      try {
        result[signal] = await this.fetchSignal(signal, config, abortSignal);
        this.logger.debug('Signal fetch complete', {
          signal,
          bucketCount: result[signal].length,
        } as LogMeta);
      } catch (error) {
        this.logger.error(`Failed to fetch ${signal} signal, using empty result`, {
          error,
        });
        result[signal] = [];
      }
    }

    return result;
  }

  private async fetchSignal(
    signal: SignalType,
    config: OtelTelemetryConfiguration,
    abortSignal?: AbortSignal
  ): Promise<CompositeBucket[]> {
    const indexPattern = SIGNAL_INDICES[signal];
    let afterKey: Record<string, unknown> | undefined;
    const allBuckets: CompositeBucket[] = [];

    do {
      const body = this.buildCompositeQuery(afterKey, config);
      const response = (await this.esClient.search(
        {
          index: indexPattern,
          ...body,
        },
        abortSignal ? { signal: abortSignal } : undefined
      )) as CompositeResponse;

      const buckets = response.aggregations?.combos?.buckets ?? [];
      allBuckets.push(...buckets);
      afterKey = response.aggregations?.combos?.after_key;

      if (allBuckets.length >= config.max_total_buckets) {
        this.logger.warn(
          `Reached max_total_buckets cap (${config.max_total_buckets}) for ${signal}, truncating`,
          {
            signal,
            collectedBuckets: allBuckets.length,
            maxTotalBuckets: config.max_total_buckets,
          } as LogMeta
        );
        break;
      }

      if (buckets.length < config.composite_page_size) {
        break;
      }
    } while (afterKey);

    return allBuckets;
  }

  private buildCompositeQuery(
    afterKey: Record<string, unknown> | undefined,
    config: OtelTelemetryConfiguration
  ) {
    const { query_timeout, composite_page_size } = config;

    const composite: Record<string, unknown> = {
      size: composite_page_size,
      sources: [
        { service_name: { terms: { field: 'service.name' } } },
        {
          environment: {
            terms: {
              field: 'resource.attributes.deployment.environment',
              missing_bucket: true,
            },
          },
        },
      ],
    };

    if (afterKey) {
      composite.after = afterKey;
    }

    return {
      size: 0,
      timeout: query_timeout,
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ range: { '@timestamp': { gte: `now-${config.query_window}` } } }],
          must_not: [
            { wildcard: { 'data_stream.dataset': '*.1m.otel' } },
            { wildcard: { 'data_stream.dataset': '*.10m.otel' } },
            { wildcard: { 'data_stream.dataset': '*.60m.otel' } },
          ],
        },
      },
      aggs: {
        combos: {
          composite,
          aggs: {
            sample: {
              diversified_sampler: {
                shard_size: SAMPLER_SHARD_SIZE,
                field: 'scope.name',
                max_docs_per_value: SAMPLER_MAX_DOCS_PER_VALUE,
              },
              aggs: {
                sdk_names: {
                  terms: { field: 'resource.attributes.telemetry.sdk.name', size: TERMS_AGG_SIZE },
                },
                sdk_languages: {
                  terms: {
                    field: 'resource.attributes.telemetry.sdk.language',
                    size: TERMS_AGG_SIZE,
                  },
                },
                sdk_versions: {
                  terms: {
                    field: 'resource.attributes.telemetry.sdk.version',
                    size: TERMS_AGG_SIZE,
                  },
                },
                distro_names: {
                  terms: {
                    field: 'resource.attributes.telemetry.distro.name',
                    size: TERMS_AGG_SIZE,
                  },
                },
                distro_versions: {
                  terms: {
                    field: 'resource.attributes.telemetry.distro.version',
                    size: TERMS_AGG_SIZE,
                  },
                },
                cloud_providers: {
                  terms: { field: 'resource.attributes.cloud.provider', size: TERMS_AGG_SIZE },
                },
                cloud_platforms: {
                  terms: { field: 'resource.attributes.cloud.platform', size: TERMS_AGG_SIZE },
                },
                cloud_regions: {
                  terms: { field: 'resource.attributes.cloud.region', size: TERMS_AGG_SIZE },
                },
                cloud_az: {
                  terms: {
                    field: 'resource.attributes.cloud.availability_zone',
                    size: TERMS_AGG_SIZE,
                  },
                },
                host_archs: {
                  terms: { field: 'resource.attributes.host.arch', size: TERMS_AGG_SIZE },
                },
                os_types: {
                  terms: { field: 'resource.attributes.os.type', size: TERMS_AGG_SIZE },
                },
                os_names: {
                  terms: { field: 'resource.attributes.os.name', size: TERMS_AGG_SIZE },
                },
                os_versions: {
                  terms: { field: 'resource.attributes.os.version', size: TERMS_AGG_SIZE },
                },
                os_descriptions: {
                  terms: { field: 'resource.attributes.os.description', size: TERMS_AGG_SIZE },
                },
                device_manufacturers: {
                  terms: { field: 'resource.attributes.device.manufacturer', size: TERMS_AGG_SIZE },
                },
                device_model_names: {
                  terms: { field: 'resource.attributes.device.model.name', size: TERMS_AGG_SIZE },
                },
                browser_platforms: {
                  terms: { field: 'resource.attributes.browser.platform', size: TERMS_AGG_SIZE },
                },
                user_agent_originals: {
                  terms: {
                    field: 'resource.attributes.user_agent.original',
                    size: TERMS_AGG_SIZE,
                  },
                },
                runtime_names: {
                  terms: {
                    field: 'resource.attributes.process.runtime.name',
                    size: TERMS_AGG_SIZE,
                  },
                },
                runtime_versions: {
                  terms: {
                    field: 'resource.attributes.process.runtime.version',
                    size: TERMS_AGG_SIZE,
                  },
                },
                runtime_descriptions: {
                  terms: {
                    field: 'resource.attributes.process.runtime.description',
                    size: TERMS_AGG_SIZE,
                  },
                },
                executable_names: {
                  terms: {
                    field: 'resource.attributes.process.executable.name',
                    size: TERMS_AGG_SIZE,
                  },
                },
                webengine_names: {
                  terms: { field: 'resource.attributes.webengine.name', size: TERMS_AGG_SIZE },
                },
                webengine_versions: {
                  terms: { field: 'resource.attributes.webengine.version', size: TERMS_AGG_SIZE },
                },
                webengine_descriptions: {
                  terms: {
                    field: 'resource.attributes.webengine.description',
                    size: TERMS_AGG_SIZE,
                  },
                },
                scope_names: {
                  terms: { field: 'scope.name', size: SCOPE_NAMES_AGG_SIZE },
                },
                upstream_cluster: {
                  terms: { field: 'resource.attributes.upstream.cluster', size: TERMS_AGG_SIZE },
                },
              },
            },
            has_k8s: {
              filter: {
                bool: {
                  should: [
                    { exists: { field: 'resource.attributes.k8s.cluster.name' } },
                    { exists: { field: 'resource.attributes.k8s.node.name' } },
                    { exists: { field: 'resource.attributes.k8s.namespace.name' } },
                    { exists: { field: 'resource.attributes.k8s.pod.name' } },
                    { exists: { field: 'resource.attributes.k8s.pod.uid' } },
                    { exists: { field: 'resource.attributes.k8s.deployment.name' } },
                    { exists: { field: 'resource.attributes.k8s.container.name' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            },
            has_container: {
              filter: {
                bool: {
                  should: [
                    { exists: { field: 'resource.attributes.container.id' } },
                    { exists: { field: 'resource.attributes.container.name' } },
                    { exists: { field: 'resource.attributes.container.image.name' } },
                    { exists: { field: 'resource.attributes.container.image.tag' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            },
          },
        },
      },
    };
  }
}
