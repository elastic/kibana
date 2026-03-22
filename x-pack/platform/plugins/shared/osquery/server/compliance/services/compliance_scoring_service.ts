/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  COMPLIANCE_FINDINGS_DATA_STREAM,
  COMPLIANCE_FINDINGS_LATEST_INDEX,
  COMPLIANCE_SCORES_DATA_STREAM,
} from '../../../common/compliance';
import type { MutedRulesState, ComplianceSectionScore, ComplianceHostScore } from '../../../common/compliance';
import { calculatePostureScore, buildMutedRulesFilter } from '../../../common/compliance';

export const computeAndWriteScores = async (
  esClient: ElasticsearchClient,
  mutedRules: MutedRulesState,
  namespace: string,
  logger: Logger
): Promise<void> => {
  const mutedFilters = buildMutedRulesFilter(mutedRules);

  const mustNot = mutedFilters.length > 0 ? mutedFilters : [];

  try {
    // Query the deduplicated findings_latest index which contains the latest finding per host+rule
    const response = await esClient.search({
      index: COMPLIANCE_FINDINGS_LATEST_INDEX,
      size: 0,
      query: {
        bool: {
          must_not: mustNot,
        },
      },
      aggs: {
        benchmarks: {
          // Extract benchmark ID from the nested latest_finding structure
          terms: { 
            field: 'latest_finding.hits.hits._source.rule.benchmark.id', 
            size: 50 
          },
          aggs: {
            benchmark_name: { 
              terms: { 
                field: 'latest_finding.hits.hits._source.rule.benchmark.name.keyword', 
                size: 1 
              } 
            },
            benchmark_version: { 
              terms: { 
                field: 'latest_finding.hits.hits._source.rule.benchmark.version', 
                size: 1 
              } 
            },
            // Count findings by evaluation from the latest finding
            passed: { 
              filter: { 
                term: { 'latest_finding.hits.hits._source.result.evaluation': 'passed' } 
              } 
            },
            failed: { 
              filter: { 
                term: { 'latest_finding.hits.hits._source.result.evaluation': 'failed' } 
              } 
            },
            not_applicable: { 
              filter: { 
                term: { 'latest_finding.hits.hits._source.result.evaluation': 'not_applicable' } 
              } 
            },
            hosts: { cardinality: { field: 'host.id' } },
          },
        },
      },
    });

    const benchmarkBuckets = (response.aggregations?.benchmarks as any)?.buckets ?? [];
    const now = new Date().toISOString();
    const scoreDocs: object[] = [];

    for (const bucket of benchmarkBuckets) {
      const passed = bucket.passed?.doc_count ?? 0;
      const failed = bucket.failed?.doc_count ?? 0;
      const notApplicable = bucket.not_applicable?.doc_count ?? 0;
      const score = calculatePostureScore(passed, failed);
      const benchmarkName = bucket.benchmark_name?.buckets?.[0]?.key ?? bucket.key;
      const benchmarkVersion = bucket.benchmark_version?.buckets?.[0]?.key ?? 'v1.0.0';

      scoreDocs.push({
        '@timestamp': now,
        score,
        total_findings: passed + failed + notApplicable,
        passed_findings: passed,
        failed_findings: failed,
        not_applicable_findings: notApplicable,
        rule: {
          benchmark: { id: bucket.key, name: benchmarkName, version: benchmarkVersion },
        },
        policy_template: 'endpoint_compliance',
        host_count: bucket.hosts?.value ?? 0,
        is_enabled_rules_score: true,
        namespace,
      });
    }

    if (scoreDocs.length > 0) {
      const body = scoreDocs.flatMap((doc) => [
        { create: { _index: COMPLIANCE_SCORES_DATA_STREAM } },
        doc,
      ]);
      await esClient.bulk({ body, refresh: false });
      logger.debug(`Wrote ${scoreDocs.length} compliance score documents`);
    }
  } catch (error) {
    logger.error(`Failed to compute compliance scores: ${error.message}`);
  }
};

export const getDashboardStats = async (
  esClient: ElasticsearchClient,
  benchmarkId: string,
  mutedRules: MutedRulesState
) => {
  const mutedFilters = buildMutedRulesFilter(mutedRules);

  try {
    // Query the deduplicated findings_latest index for more accurate stats
    const response = await esClient.search({
      index: COMPLIANCE_FINDINGS_LATEST_INDEX,
      size: 0,
      query: {
        bool: {
          must: [{ 
            term: { 'latest_finding.hits.hits._source.rule.benchmark.id': benchmarkId } 
          }],
          must_not: mutedFilters,
        },
      },
      aggs: {
        passed: { 
          filter: { 
            term: { 'latest_finding.hits.hits._source.result.evaluation': 'passed' } 
          } 
        },
        failed: { 
          filter: { 
            term: { 'latest_finding.hits.hits._source.result.evaluation': 'failed' } 
          } 
        },
        not_applicable: { 
          filter: { 
            term: { 'latest_finding.hits.hits._source.result.evaluation': 'not_applicable' } 
          } 
        },
        hosts: { cardinality: { field: 'host.id' } },
        sections: {
          terms: { field: 'latest_finding.hits.hits._source.rule.section', size: 20 },
          aggs: {
            passed: { 
              filter: { 
                term: { 'latest_finding.hits.hits._source.result.evaluation': 'passed' } 
              } 
            },
            failed: { 
              filter: { 
                term: { 'latest_finding.hits.hits._source.result.evaluation': 'failed' } 
              } 
            },
            score: {
              bucket_script: {
                buckets_path: { p: 'passed._count', f: 'failed._count' },
                script: 'params.p + params.f == 0 ? 0 : Math.round(params.p * 1000.0 / (params.p + params.f)) / 10.0',
              },
            },
          },
        },
        worst_hosts: {
          terms: { field: 'host.id', size: 10 },
          aggs: {
            host_name: { 
              terms: { 
                field: 'latest_finding.hits.hits._source.host.name.keyword', 
                size: 1 
              } 
            },
            os_name: { 
              terms: { 
                field: 'latest_finding.hits.hits._source.host.os.name', 
                size: 1 
              } 
            },
            os_version: { 
              terms: { 
                field: 'latest_finding.hits.hits._source.host.os.version', 
                size: 1 
              } 
            },
            passed: { 
              filter: { 
                term: { 'latest_finding.hits.hits._source.result.evaluation': 'passed' } 
              } 
            },
            failed: { 
              filter: { 
                term: { 'latest_finding.hits.hits._source.result.evaluation': 'failed' } 
              } 
            },
            score: {
              bucket_script: {
                buckets_path: { p: 'passed._count', f: 'failed._count' },
                script: 'params.p + params.f == 0 ? 0 : Math.round(params.p * 1000.0 / (params.p + params.f)) / 10.0',
              },
            },
            last_eval: { max: { field: '@timestamp' } },
          },
        },
      },
    });

    const aggs = response.aggregations as any;
    const passed = aggs?.passed?.doc_count ?? 0;
    const failed = aggs?.failed?.doc_count ?? 0;
    const notApplicable = aggs?.not_applicable?.doc_count ?? 0;

    const sections: ComplianceSectionScore[] = (aggs?.sections?.buckets ?? [])
      .map((b: any) => ({
        section: b.key,
        passed: b.passed?.doc_count ?? 0,
        failed: b.failed?.doc_count ?? 0,
        score: b.score?.value ?? 0,
      }))
      .sort((a: ComplianceSectionScore, b: ComplianceSectionScore) => a.score - b.score)
      .slice(0, 5);

    const worstHosts: ComplianceHostScore[] = (aggs?.worst_hosts?.buckets ?? [])
      .map((b: any) => ({
        host_id: b.key,
        host_name: b.host_name?.buckets?.[0]?.key ?? b.key,
        os_name: b.os_name?.buckets?.[0]?.key ?? '',
        os_version: b.os_version?.buckets?.[0]?.key ?? '',
        passed: b.passed?.doc_count ?? 0,
        failed: b.failed?.doc_count ?? 0,
        score: b.score?.value ?? 0,
        last_evaluated: b.last_eval?.value_as_string ?? '',
      }))
      .sort((a: ComplianceHostScore, b: ComplianceHostScore) => a.score - b.score)
      .slice(0, 10);

    return {
      score: calculatePostureScore(passed, failed),
      total_findings: passed + failed + notApplicable,
      passed_findings: passed,
      failed_findings: failed,
      not_applicable_findings: notApplicable,
      host_count: aggs?.hosts?.value ?? 0,
      sections,
      worst_hosts: worstHosts,
    };
  } catch (error) {
    return {
      score: 0,
      total_findings: 0,
      passed_findings: 0,
      failed_findings: 0,
      not_applicable_findings: 0,
      host_count: 0,
      sections: [],
      worst_hosts: [],
    };
  }
};

export const getScoreTrend = async (
  esClient: ElasticsearchClient,
  benchmarkId: string,
  timeRange: string = '24h'
) => {
  try {
    const response = await esClient.search({
      index: COMPLIANCE_SCORES_DATA_STREAM,
      size: 0,
      query: {
        bool: {
          must: [
            { term: { 'rule.benchmark.id': benchmarkId } },
            { range: { '@timestamp': { gte: `now-${timeRange}` } } },
          ],
        },
      },
      aggs: {
        trend: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: timeRange === '24h' ? '5m' : timeRange === '7d' ? '1h' : '6h',
          },
          aggs: {
            avg_score: { avg: { field: 'score' } },
          },
        },
      },
    });

    const buckets = (response.aggregations?.trend as any)?.buckets ?? [];

    return buckets.map((b: any) => ({
      timestamp: b.key_as_string,
      score: b.avg_score?.value ?? 0,
    }));
  } catch (error) {
    return [];
  }
};

export const findComplianceFindings = async (
  esClient: ElasticsearchClient,
  options: {
    benchmarkId?: string;
    section?: string;
    hostId?: string;
    evaluation?: string;
    page?: number;
    perPage?: number;
  } = {}
) => {
  const { page = 1, perPage = 20, ...filters } = options;
  const must: object[] = [];

  // Build filters for the deduplicated findings_latest index structure
  if (filters.benchmarkId) {
    must.push({ 
      term: { 'latest_finding.hits.hits._source.rule.benchmark.id': filters.benchmarkId } 
    });
  }
  if (filters.section) {
    must.push({ 
      term: { 'latest_finding.hits.hits._source.rule.section': filters.section } 
    });
  }
  if (filters.hostId) {
    must.push({ term: { 'host.id': filters.hostId } });
  }
  if (filters.evaluation) {
    must.push({ 
      term: { 'latest_finding.hits.hits._source.result.evaluation': filters.evaluation } 
    });
  }

  try {
    // Query the deduplicated findings_latest index to get only the latest findings
    const response = await esClient.search({
      index: COMPLIANCE_FINDINGS_LATEST_INDEX,
      from: (page - 1) * perPage,
      size: perPage,
      query: must.length > 0 ? { bool: { must } } : { match_all: {} },
      sort: [{ '@timestamp': 'desc' }],
    });

    return {
      total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0,
      page,
      per_page: perPage,
      // Extract the actual finding from the transform structure
      findings: response.hits.hits.map((hit) => {
        const source = hit._source as any;
        const latestFinding = source.latest_finding?.hits?.hits?.[0]?._source;
        return { 
          id: hit._id, 
          ...latestFinding,
          // Keep the transform metadata for reference
          _transform_metadata: {
            rule_id: source['rule.id'],
            host_id: source['host.id'],
            last_updated: source['@timestamp'],
          }
        };
      }),
    };
  } catch (error) {
    return { total: 0, page, per_page: perPage, findings: [] };
  }
};
