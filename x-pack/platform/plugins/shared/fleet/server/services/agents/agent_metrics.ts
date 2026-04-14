/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { Agent } from '../../types';
import { appContextService } from '../app_context';
import { DATA_TIERS } from '../../../common/constants';

const AGGREGATION_MAX_SIZE = 1000;

export async function fetchAndAssignAgentMetrics(esClient: ElasticsearchClient, agents: Agent[]) {
  try {
    const fleetAgents = agents.filter((agent) => agent.type !== 'OPAMP');
    const opampAgents = agents.filter((agent) => agent.type === 'OPAMP');
    const fleetAgentsMetrics = await _fetchAndAssignAgentMetrics(esClient, fleetAgents);
    const opampAgentsMetrics = await _fetchAndAssignOtelMetrics(esClient, opampAgents);
    const metricsMap = [...fleetAgentsMetrics, ...opampAgentsMetrics].reduce((acc, agent) => {
      acc[agent.id] = agent.metrics;
      return acc;
    }, {} as Record<string, Agent['metrics']>);

    return agents.map((agent) => ({
      ...agent,
      metrics: metricsMap[agent.id],
    }));
  } catch (err) {
    //  Do not throw if we are not able to fetch metrics, as it could occur if the user is missing some permissions
    appContextService.getLogger().warn(err);

    return agents;
  }
}

async function _fetchAndAssignOtelMetrics(esClient: ElasticsearchClient, agents: Agent[]) {
  const res = await esClient.search<
    unknown,
    Record<
      'agents',
      {
        buckets: Array<{
          key: string;
          avg_memory_size: { value: number };
          avg_cpu: { value: number };
        }>;
      }
    >
  >({
    ...(aggregationQueryBuilderOtel(agents.map(({ id }) => id)) as any),
    index: 'metrics-collectortelemetry.otel-*',
  });

  const formattedResults =
    res.aggregations?.agents.buckets.reduce((acc, bucket) => {
      acc[bucket.key] = {
        avg_memory_size: bucket.avg_memory_size.value,
        avg_cpu: bucket.avg_cpu.value,
      };
      return acc;
    }, {} as Record<string, { avg_memory_size: number; avg_cpu: number }>) ?? {};

  return agents.map((agent) => {
    const results = formattedResults[agent.id];

    return {
      id: agent.id,
      metrics: {
        cpu_avg: results?.avg_cpu ? Math.trunc(results.avg_cpu * 100000) / 100000 : undefined,
        memory_size_byte_avg: results?.avg_memory_size
          ? Math.trunc(results?.avg_memory_size)
          : undefined,
      },
    };
  });
}

const aggregationQueryBuilderOtel = (agentIds: string[]) => ({
  size: 0,
  query: {
    bool: {
      must: [
        {
          terms: {
            _tier: DATA_TIERS,
          },
        },
        {
          range: {
            '@timestamp': {
              gte: 'now-5m',
            },
          },
        },
        {
          terms: {
            'service.instance.id': agentIds,
          },
        },
        {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      term: {
                        'data_stream.dataset': 'collectortelemetry.otel',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
  aggs: {
    agents: {
      terms: {
        field: 'service.instance.id',
        size: AGGREGATION_MAX_SIZE,
      },
      aggs: {
        avg_memory_size: {
          avg: {
            field: 'otelcol_process_memory_rss',
          },
        },

        cpu_seconds_max: { max: { field: 'otelcol_process_cpu_seconds' } },
        cpu_seconds_min: { min: { field: 'otelcol_process_cpu_seconds' } },
        uptime_max: { max: { field: 'otelcol_process_uptime' } },
        uptime_min: { min: { field: 'otelcol_process_uptime' } },

        avg_cpu: {
          bucket_script: {
            buckets_path: {
              cpuMax: 'cpu_seconds_max',
              cpuMin: 'cpu_seconds_min',
              upMax: 'uptime_max',
              upMin: 'uptime_min',
            },
            script:
              'double cpuDelta = params.cpuMax - params.cpuMin; double upDelta = params.upMax - params.upMin; return upDelta > 0 ? (cpuDelta / upDelta) : null;',
          },
        },
      },
    },
  },
});

async function _fetchAndAssignAgentMetrics(esClient: ElasticsearchClient, agents: Agent[]) {
  const res = await esClient.search<
    unknown,
    Record<
      'agents',
      {
        buckets: Array<{
          key: string;
          sum_memory_size: { value: number };
          sum_cpu: { value: number };
        }>;
      }
    >
  >({
    ...(aggregationQueryBuilder(agents.map(({ id }) => id)) as any),
    index: 'metrics-elastic_agent.*',
  });

  const formattedResults =
    res.aggregations?.agents.buckets.reduce((acc, bucket) => {
      acc[bucket.key] = {
        sum_memory_size: bucket.sum_memory_size.value,
        sum_cpu: bucket.sum_cpu.value,
      };
      return acc;
    }, {} as Record<string, { sum_memory_size: number; sum_cpu: number }>) ?? {};

  return agents.map((agent) => {
    const results = formattedResults[agent.id];

    return {
      id: agent.id,
      metrics: {
        cpu_avg: results?.sum_cpu ? Math.trunc(results.sum_cpu * 100000) / 100000 : undefined,
        memory_size_byte_avg: results?.sum_memory_size
          ? Math.trunc(results?.sum_memory_size)
          : undefined,
      },
    };
  });
}

const aggregationQueryBuilder = (agentIds: string[]) => ({
  size: 0,
  query: {
    bool: {
      must: [
        {
          terms: {
            _tier: DATA_TIERS,
          },
        },
        {
          range: {
            '@timestamp': {
              gte: 'now-5m',
            },
          },
        },
        {
          terms: {
            'elastic_agent.id': agentIds,
          },
        },
        {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      term: {
                        'data_stream.dataset': 'elastic_agent.elastic_agent',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
  aggs: {
    agents: {
      terms: {
        field: 'elastic_agent.id',
        size: AGGREGATION_MAX_SIZE,
      },
      aggs: {
        sum_memory_size: {
          sum_bucket: {
            buckets_path: 'processes>avg_memory_size',
          },
        },
        sum_cpu: {
          sum_bucket: {
            buckets_path: 'processes>avg_cpu',
          },
        },
        processes: {
          terms: {
            field: 'component.id',
            size: AGGREGATION_MAX_SIZE,
            order: {
              _count: 'desc',
            },
          },
          aggs: {
            avg_cpu: {
              avg_bucket: {
                buckets_path: 'cpu_time_series>cpu',
              },
            },
            avg_memory_size: {
              avg: {
                field: 'system.process.memory.size',
              },
            },
            cpu_time_series: {
              date_histogram: {
                field: '@timestamp',
                calendar_interval: 'minute',
              },
              aggs: {
                max_cpu: {
                  max: {
                    field: 'system.process.cpu.total.value',
                  },
                },
                cpu_derivative: {
                  derivative: {
                    buckets_path: 'max_cpu',
                    gap_policy: 'skip',
                    unit: '10s',
                  },
                },
                cpu: {
                  bucket_script: {
                    buckets_path: {
                      cpu_total: 'cpu_derivative[normalized_value]',
                    },
                    script: {
                      source: `if (params.cpu_total > 0) {
                      return params.cpu_total / params._interval;
                    } else {
                      return 0;
                    }`,
                      lang: 'painless',
                      params: {
                        _interval: 10000,
                      },
                    },
                    gap_policy: 'skip',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
