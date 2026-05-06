/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import { skillIndexName } from '../services/skills/persisted/client/storage';
import { pluginIndexName } from '../services/plugins/client/storage';

export const isIndexNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const castError = error as {
    attributes?: {
      caused_by?: { type?: string };
      error?: { caused_by?: { type?: string } };
    };
    message?: string;
    meta?: {
      body?: {
        error?: {
          type?: string;
          caused_by?: { type?: string };
        };
      };
    };
  };

  // Check various error structure formats from Elasticsearch client
  return (
    castError.attributes?.caused_by?.type === 'index_not_found_exception' ||
    castError.attributes?.error?.caused_by?.type === 'index_not_found_exception' ||
    castError.meta?.body?.error?.type === 'index_not_found_exception' ||
    castError.meta?.body?.error?.caused_by?.type === 'index_not_found_exception' ||
    (typeof castError.message === 'string' &&
      castError.message.includes('index_not_found_exception'))
  );
};

/**
 * Usage counter data from saved objects
 */
export interface UsageCounterData {
  counterName: string;
  counterType: string;
  count: number;
  domainId: string;
}

/**
 * Query utilities for telemetry data collection
 *
 * Provides helpers for querying:
 * - Usage counters from saved objects
 * - Conversation data from Elasticsearch
 * - Custom tools and agents from Elasticsearch
 */
export class QueryUtils {
  private readonly defaultTimingMetrics = {
    p50: 0,
    p75: 0,
    p90: 0,
    p95: 0,
    p99: 0,
    mean: 0,
    total_samples: 0,
  };

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Get all usage counters for a specific domain
   * @param domainId - Domain identifier (e.g., 'agent_builder')
   * @param lookbackMs - Optional lookback window in milliseconds (defaults to last 24h)
   * @returns Array of usage counter data
   */
  async getCountersByDomain(
    domainId: string,
    lookbackMs: number = 24 * 60 * 60 * 1000
  ): Promise<UsageCounterData[]> {
    try {
      const fromDate = new Date(Date.now() - lookbackMs).toISOString();
      const { saved_objects: savedObjects } = await this.soClient.find<{
        domainId: string;
        counterName: string;
        counterType: string;
        count: number;
      }>({
        type: 'usage-counter',
        perPage: 10000,
        filter: `usage-counter.attributes.domainId:"${domainId}" and usage-counter.updated_at >= "${fromDate}"`,
      });

      return savedObjects.map((so) => ({
        counterName: so.attributes.counterName,
        counterType: so.attributes.counterType,
        count: so.attributes.count,
        domainId: so.attributes.domainId,
      }));
    } catch (error) {
      this.logger.error(`Failed to query usage counters: ${error.message}`);
      return [];
    }
  }

  /**
   * Get usage counters filtered by name prefix
   * @param domainId - Domain identifier
   * @param prefix - Counter name prefix (e.g., 'tool_call_')
   * @param lookbackMs
   * @returns Map of counter name → count
   */
  async getCountersByPrefix(
    domainId: string,
    prefix: string,
    lookbackMs: number = 24 * 60 * 60 * 1000
  ): Promise<Map<string, number>> {
    try {
      const allCounters = await this.getCountersByDomain(domainId, lookbackMs);
      const filtered = allCounters.filter((counter) => counter.counterName.startsWith(prefix));

      const result = new Map<string, number>();
      for (const counter of filtered) {
        result.set(counter.counterName, counter.count);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to query counters by prefix "${prefix}": ${error.message}`);
      return new Map();
    }
  }

  async getCustomToolsMetrics() {
    try {
      const toolIndexName = chatSystemIndex('tools');
      const response = await this.esClient.search({
        index: toolIndexName,
        size: 0,
        aggs: {
          by_type: {
            terms: {
              field: 'type',
              size: 100,
            },
          },
        },
        query: {
          bool: {
            must_not: [
              {
                term: {
                  type: 'builtin',
                },
              },
            ],
          },
        },
      });

      const buckets = (response.aggregations?.by_type as any)?.buckets || [];
      const byType = buckets.map((bucket: any) => ({
        type: bucket.key as string,
        count: bucket.doc_count as number,
      }));

      const total = buckets.reduce((sum: number, bucket: any) => sum + bucket.doc_count, 0);

      return {
        total,
        by_type: byType,
      };
    } catch (error) {
      // Suppress warning for missing index - expected when no tools have been created yet
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch custom tools counts: ${error.message}`);
      }
      return {
        total: 0,
        by_type: [],
      };
    }
  }

  /**
   * Get counts of custom agents from Elasticsearch
   */
  async getCustomAgentsMetrics() {
    try {
      const agentsIndexName = chatSystemIndex('agents');
      const response = await this.esClient.count({
        index: agentsIndexName,
      });

      return response.count || 0;
    } catch (error) {
      // Suppress warning for missing index - expected when no agents have been created yet
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch custom agents count: ${error.message}`);
      }
      return 0;
    }
  }

  /**
   * Get counts of persisted skills from Elasticsearch, broken down by origin.
   * Skills with a `plugin_id` field are plugin-bundled; the rest are custom.
   * Built-in skills are not persisted, so we get that count separately.
   */
  async getSkillsMetrics(): Promise<{
    total: number;
    custom: number;
    plugin: number;
  }> {
    try {
      const response = await this.esClient.search({
        index: skillIndexName,
        size: 0,
        track_total_hits: true,
        aggs: {
          custom: {
            filter: {
              bool: {
                must_not: { exists: { field: 'plugin_id' } },
              },
            },
          },
          plugin: {
            filter: {
              exists: { field: 'plugin_id' },
            },
          },
        },
      });

      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;
      const customCount = (response.aggregations?.custom as { doc_count?: number })?.doc_count ?? 0;
      const pluginCount = (response.aggregations?.plugin as { doc_count?: number })?.doc_count ?? 0;

      return {
        total,
        custom: customCount,
        plugin: pluginCount,
      };
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch skills metrics: ${(error as Error).message}`);
      }
      return { total: 0, custom: 0, plugin: 0 };
    }
  }

  /**
   * Get total count of installed plugins from Elasticsearch.
   */
  async getPluginsCount(): Promise<number> {
    try {
      const response = await this.esClient.count({
        index: pluginIndexName,
      });

      return response.count || 0;
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch plugins count: ${(error as Error).message}`);
      }
      return 0;
    }
  }

  /**
   * Get conversation metrics from Elasticsearch
   */
  async getConversationMetrics(dateFilter?: { gte: string }) {
    try {
      const conversationIndexName = chatSystemIndex('conversations');

      const query: Record<string, any> = dateFilter
        ? { bool: { filter: [{ range: { created_at: { gte: dateFilter.gte } } }] } }
        : { match_all: {} };

      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        track_total_hits: true,
        query,
        aggs: {
          rounds_distribution: {
            terms: {
              script: {
                source: `
                def source = params._source;
                def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
                def rounds = roundsArray != null ? roundsArray.size() : 0;

                if (rounds <= 5) return '1-5';
                if (rounds <= 10) return '6-10';
                if (rounds <= 20) return '11-20';
                if (rounds <= 50) return '21-50';
                return '51+';
              `,
                lang: 'painless',
              },
              size: 100,
            },
          },
          total_rounds: {
            sum: {
              script: {
                source: `
                  def source = params._source;
                  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
                  return roundsArray != null ? roundsArray.size() : 0;
                `,
                lang: 'painless',
              },
            },
          },
          total_input_tokens: {
            sum: {
              script: {
                source: `
                  def source = params._source;
                  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
                  def total = 0;
                  if (roundsArray != null) {
                    for (def round : roundsArray) {
                      if (round.model_usage != null) {
                        total += round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
                      }
                    }
                  }
                  return total;
                `,
                lang: 'painless',
              },
            },
          },
          total_output_tokens: {
            sum: {
              script: {
                source: `
                  def source = params._source;
                  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
                  def total = 0;
                  if (roundsArray != null) {
                    for (def round : roundsArray) {
                      if (round.model_usage != null) {
                        total += round.model_usage.output_tokens != null ? round.model_usage.output_tokens : 0;
                      }
                    }
                  }
                  return total;
                `,
                lang: 'painless',
              },
            },
          },
        },
      });

      const buckets = (response.aggregations?.rounds_distribution as any)?.buckets || [];
      const roundsDistribution = buckets.map((bucket: any) => ({
        bucket: bucket.key as string,
        count: bucket.doc_count as number,
      }));

      const totalRoundsAgg = response.aggregations?.total_rounds as any;
      const totalRounds = Math.round(totalRoundsAgg?.value || 0);

      const total = response.hits.total as any;
      const totalConversations = typeof total === 'number' ? total : total?.value || 0;
      const avgRoundsPerConversation =
        totalConversations > 0 ? totalRounds / totalConversations : 0;

      const totalInputTokensAgg = response.aggregations?.total_input_tokens as any;
      const totalOutputTokensAgg = response.aggregations?.total_output_tokens as any;
      const tokensInput = Math.round(totalInputTokensAgg?.value || 0);
      const tokensOutput = Math.round(totalOutputTokensAgg?.value || 0);
      const tokensUsed = tokensInput + tokensOutput;
      const averageTokensPerConversation =
        totalConversations > 0 ? tokensUsed / totalConversations : 0;

      return {
        total: totalConversations,
        total_rounds: totalRounds,
        avg_rounds_per_conversation: Math.round(avgRoundsPerConversation * 100) / 100,
        rounds_distribution: roundsDistribution,
        tokens_used: tokensUsed,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        average_tokens_per_conversation: Math.round(averageTokensPerConversation * 100) / 100,
      };
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch conversation metrics: ${error.message}`);
      }
      return {
        total: 0,
        total_rounds: 0,
        avg_rounds_per_conversation: 0,
        rounds_distribution: [],
        tokens_used: 0,
        tokens_input: 0,
        tokens_output: 0,
        average_tokens_per_conversation: 0,
      };
    }
  }

  // ── Combined round metrics (single ES query) ────────────────────────

  /**
   * Single ES query that collects all round-level metrics: TTFT, TTLT,
   * tokens / TTLT / tool-calls grouped by model, and TTLT grouped by agent.
   * Flat TTLT is derived from the union of all per-model TTLT lists.
   */
  async getAllRoundMetrics(dateFilter?: { gte: string }): Promise<{
    ttft: {
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
      mean: number;
      total_samples: number;
    };
    ttlt: {
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
      mean: number;
      total_samples: number;
    };
    byModel: Array<{
      model: string;
      ttlt_p50: number;
      ttlt_p75: number;
      ttlt_p90: number;
      ttlt_p95: number;
      ttlt_p99: number;
      ttlt_mean: number;
      ttlt_samples: number;
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      rounds: number;
      avg_tokens_per_round: number;
      tool_calls: number;
    }>;
    byAgent: Array<{
      agent_id: string;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
      mean: number;
      total_samples: number;
    }>;
  }> {
    const empty = {
      ttft: { ...this.defaultTimingMetrics },
      ttlt: { ...this.defaultTimingMetrics },
      byModel: [],
      byAgent: [],
    };

    try {
      const conversationIndexName = chatSystemIndex('conversations');
      const query: Record<string, any> = dateFilter
        ? { bool: { filter: [{ range: { created_at: { gte: dateFilter.gte } } }] } }
        : { match_all: {} };

      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        query,
        aggs: {
          round_metrics: {
            scripted_metric: {
              init_script: `
                state.ttft = new ArrayList();
                state.byModel = new HashMap();
                state.byAgent = new HashMap();
              `,
              map_script: `
                def agentId = params._source.agent_id;
                if (agentId == null) agentId = 'unknown';
                def rounds = params._source.conversation_rounds;
                if (rounds == null) { rounds = params._source.rounds; }
                if (rounds == null) return;

                if (!state.byAgent.containsKey(agentId)) {
                  state.byAgent.put(agentId, new ArrayList());
                }
                def agentTtlt = state.byAgent.get(agentId);

                for (def round : rounds) {
                  def ttft = round.time_to_first_token;
                  if (ttft != null && ttft > 0) { state.ttft.add(ttft); }

                  def ttlt = round.time_to_last_token;
                  if (ttlt != null && ttlt > 0) { agentTtlt.add(ttlt); }

                  def model = 'unknown';
                  if (round.model_usage != null && round.model_usage.model != null) {
                    model = round.model_usage.model;
                  }
                  if (!state.byModel.containsKey(model)) {
                    state.byModel.put(model, ['ttlt': new ArrayList(), 'input': 0L, 'output': 0L, 'rounds': 0, 'toolCalls': 0]);
                  }
                  def m = state.byModel.get(model);
                  if (ttlt != null && ttlt > 0) { m.ttlt.add(ttlt); }
                  if (round.model_usage != null) {
                    m.input += round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
                    m.output += round.model_usage.output_tokens != null ? round.model_usage.output_tokens : 0;
                  }
                  m.rounds += 1;

                  def steps = round.steps;
                  if (steps != null) {
                    for (def step : steps) {
                      if (step.type != null && step.type == 'tool_call') { m.toolCalls += 1; }
                    }
                  }
                }
              `,
              combine_script: 'return state;',
              reduce_script: `
                // ── merge shard states ──
                List allTtft = new ArrayList();
                Map modelMap = new HashMap();
                Map agentMap = new HashMap();

                for (def s : states) {
                  if (s == null) continue;
                  allTtft.addAll(s.ttft);

                  for (def e : s.byModel.entrySet()) {
                    def k = e.getKey();
                    def d = e.getValue();
                    if (!modelMap.containsKey(k)) {
                      modelMap.put(k, ['ttlt': new ArrayList(), 'input': 0L, 'output': 0L, 'rounds': 0, 'toolCalls': 0]);
                    }
                    def c = modelMap.get(k);
                    c.ttlt.addAll(d.ttlt);
                    c.input += d.input;
                    c.output += d.output;
                    c.rounds += d.rounds;
                    c.toolCalls += d.toolCalls;
                  }

                  for (def e : s.byAgent.entrySet()) {
                    def k = e.getKey();
                    if (!agentMap.containsKey(k)) {
                      agentMap.put(k, new ArrayList());
                    }
                    agentMap.get(k).addAll(e.getValue());
                  }
                }

                // ── flat TTLT = union of all per-model TTLT lists ──
                List allTtlt = new ArrayList();
                for (def me : modelMap.values()) {
                  allTtlt.addAll(me.ttlt);
                }

                // ── compute percentiles for a list into a map ──
                // Collected into a List of [label, sourceList] pairs so we
                // can loop instead of duplicating the math 4+ times.
                def percentileSets = new ArrayList();
                percentileSets.add(['ttft', allTtft]);
                percentileSets.add(['ttlt', allTtlt]);
                Map pcResults = new HashMap();
                for (def pair : percentileSets) {
                  def label = pair[0];
                  List vals = pair[1];
                  Collections.sort(vals);
                  int n = vals.size();
                  def r = new HashMap();
                  if (n == 0) {
                    for (def p : [50,75,90,95,99]) { r.put('p'+String.valueOf(p), 0); }
                    r.put('mean', 0.0);
                    r.put('total_samples', 0);
                  } else {
                    double sum = 0;
                    for (def v : vals) { sum += v; }
                    for (def p : [50,75,90,95,99]) {
                      int idx = (int) Math.ceil((double)p / 100.0 * n) - 1;
                      if (idx < 0) idx = 0;
                      if (idx >= n) idx = n - 1;
                      r.put('p'+String.valueOf(p), vals.get(idx));
                    }
                    r.put('mean', sum / n);
                    r.put('total_samples', n);
                  }
                  pcResults.put(label, r);
                }

                // ── per-model results ──
                def byModelResults = new ArrayList();
                for (def e : modelMap.entrySet()) {
                  def d = e.getValue();
                  List vals = d.ttlt;
                  Collections.sort(vals);
                  int n = vals.size();
                  def r = new HashMap();
                  r.put('model', e.getKey());
                  if (n > 0) {
                    double sum = 0;
                    for (def v : vals) { sum += v; }
                    for (def p : [50,75,90,95,99]) {
                      int idx = (int) Math.ceil((double)p / 100.0 * n) - 1;
                      if (idx < 0) idx = 0;
                      if (idx >= n) idx = n - 1;
                      r.put('ttlt_p'+String.valueOf(p), vals.get(idx));
                    }
                    r.put('ttlt_mean', sum / n);
                  } else {
                    for (def p : [50,75,90,95,99]) { r.put('ttlt_p'+String.valueOf(p), 0); }
                    r.put('ttlt_mean', 0.0);
                  }
                  r.put('ttlt_samples', n);
                  r.put('input_tokens', d.input);
                  r.put('output_tokens', d.output);
                  long total = d.input + d.output;
                  r.put('total_tokens', total);
                  r.put('rounds', d.rounds);
                  r.put('avg_tokens_per_round', d.rounds > 0 ? (double)total / d.rounds : 0.0);
                  r.put('tool_calls', d.toolCalls);
                  byModelResults.add(r);
                }

                // ── per-agent results ──
                def byAgentResults = new ArrayList();
                for (def e : agentMap.entrySet()) {
                  List vals = e.getValue();
                  Collections.sort(vals);
                  int n = vals.size();
                  def r = new HashMap();
                  r.put('agent_id', e.getKey());
                  if (n > 0) {
                    double sum = 0;
                    for (def v : vals) { sum += v; }
                    for (def p : [50,75,90,95,99]) {
                      int idx = (int) Math.ceil((double)p / 100.0 * n) - 1;
                      if (idx < 0) idx = 0;
                      if (idx >= n) idx = n - 1;
                      r.put('p'+String.valueOf(p), vals.get(idx));
                    }
                    r.put('mean', sum / n);
                  } else {
                    for (def p : [50,75,90,95,99]) { r.put('p'+String.valueOf(p), 0); }
                    r.put('mean', 0.0);
                  }
                  r.put('total_samples', n);
                  byAgentResults.add(r);
                }

                return [
                  'ttft': pcResults.get('ttft'),
                  'ttlt': pcResults.get('ttlt'),
                  'byModel': byModelResults,
                  'byAgent': byAgentResults
                ];
              `,
            },
          },
        },
      });

      const v = (response.aggregations?.round_metrics as any)?.value;
      if (!v) return empty;

      const parsePercentiles = (raw: any) => ({
        p50: Math.round(raw?.p50 || 0),
        p75: Math.round(raw?.p75 || 0),
        p90: Math.round(raw?.p90 || 0),
        p95: Math.round(raw?.p95 || 0),
        p99: Math.round(raw?.p99 || 0),
        mean: Math.round(raw?.mean || 0),
        total_samples: raw?.total_samples || 0,
      });

      return {
        ttft: parsePercentiles(v.ttft),
        ttlt: parsePercentiles(v.ttlt),
        byModel: (v.byModel || []).map((m: any) => ({
          model: m.model || 'unknown',
          ttlt_p50: Math.round(m.ttlt_p50 || 0),
          ttlt_p75: Math.round(m.ttlt_p75 || 0),
          ttlt_p90: Math.round(m.ttlt_p90 || 0),
          ttlt_p95: Math.round(m.ttlt_p95 || 0),
          ttlt_p99: Math.round(m.ttlt_p99 || 0),
          ttlt_mean: Math.round(m.ttlt_mean || 0),
          ttlt_samples: m.ttlt_samples || 0,
          input_tokens: Math.round(m.input_tokens || 0),
          output_tokens: Math.round(m.output_tokens || 0),
          total_tokens: Math.round(m.total_tokens || 0),
          rounds: m.rounds || 0,
          avg_tokens_per_round: Math.round((m.avg_tokens_per_round || 0) * 100) / 100,
          tool_calls: m.tool_calls || 0,
        })),
        byAgent: (v.byAgent || []).map((a: any) => ({
          agent_id: a.agent_id || 'unknown',
          ...parsePercentiles(a),
        })),
      };
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch round metrics: ${(error as Error).message}`);
      }
      return empty;
    }
  }

  /**
   * Calculate percentiles from bucketed time data
   * @param buckets - Map of bucket name → count
   * @returns Calculated percentiles (p50, p75, p90, p95, p99, mean)
   */
  calculatePercentilesFromBuckets(
    buckets: Map<string, number>,
    domainPrefix: string = 'agent_builder'
  ): {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    mean: number;
  } {
    // Bucket boundaries (in milliseconds) - keys include domain prefix
    const bucketRanges: Record<string, { min: number; max: number; mid: number }> = {
      [`${domainPrefix}_query_to_result_time_<1s`]: { min: 0, max: 1000, mid: 500 },
      [`${domainPrefix}_query_to_result_time_1-5s`]: { min: 1000, max: 5000, mid: 3000 },
      [`${domainPrefix}_query_to_result_time_5-10s`]: { min: 5000, max: 10000, mid: 7500 },
      [`${domainPrefix}_query_to_result_time_10-30s`]: { min: 10000, max: 30000, mid: 20000 },
      [`${domainPrefix}_query_to_result_time_30s+`]: { min: 30000, max: 120000, mid: 60000 },
    };

    // Build cumulative distribution
    const sortedBuckets = [
      `${domainPrefix}_query_to_result_time_<1s`,
      `${domainPrefix}_query_to_result_time_1-5s`,
      `${domainPrefix}_query_to_result_time_5-10s`,
      `${domainPrefix}_query_to_result_time_10-30s`,
      `${domainPrefix}_query_to_result_time_30s+`,
    ];

    let totalCount = 0;
    const cumulativeCounts: Array<{ bucket: string; count: number; cumulative: number }> = [];

    for (const bucketName of sortedBuckets) {
      const count = buckets.get(bucketName) || 0;
      totalCount += count;
      cumulativeCounts.push({
        bucket: bucketName,
        count,
        cumulative: totalCount,
      });
    }

    if (totalCount === 0) {
      return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, mean: 0 };
    }

    // Calculate percentiles using linear interpolation
    const calculatePercentile = (percentile: number): number => {
      const targetCount = (percentile / 100) * totalCount;

      for (let i = 0; i < cumulativeCounts.length; i++) {
        const current = cumulativeCounts[i];
        const previous = i > 0 ? cumulativeCounts[i - 1] : { cumulative: 0 };

        if (current.cumulative >= targetCount) {
          const range = bucketRanges[current.bucket];
          if (!range) return 0;

          // Linear interpolation within bucket
          const bucketProgress =
            current.count > 0 ? (targetCount - previous.cumulative) / current.count : 0;

          return range.min + bucketProgress * (range.max - range.min);
        }
      }

      // Fallback to last bucket
      const lastBucket = cumulativeCounts[cumulativeCounts.length - 1];
      return bucketRanges[lastBucket.bucket]?.mid || 0;
    };

    // Calculate mean using bucket midpoints
    let weightedSum = 0;
    for (const { bucket, count } of cumulativeCounts) {
      const range = bucketRanges[bucket];
      if (range) {
        weightedSum += range.mid * count;
      }
    }
    const mean = weightedSum / totalCount;

    return {
      p50: calculatePercentile(50),
      p75: calculatePercentile(75),
      p90: calculatePercentile(90),
      p95: calculatePercentile(95),
      p99: calculatePercentile(99),
      mean,
    };
  }
}
