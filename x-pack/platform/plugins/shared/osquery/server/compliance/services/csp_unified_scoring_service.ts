/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface UnifiedComplianceScore {
  overall_score: number;
  component_scores: {
    endpoint: {
      score: number;
      weight: number;
      total_findings: number;
      passed: number;
      failed: number;
    };
    cloud: {
      score: number;
      weight: number;
      total_findings: number;
      passed: number;
      failed: number;
    };
    kubernetes: {
      score: number;
      weight: number;
      total_findings: number;
      passed: number;
      failed: number;
    };
  };
  by_framework: Array<{
    framework: 'cis' | 'pci-dss' | 'iso27001' | 'nist' | 'soc2';
    overall_score: number;
    endpoint_score: number;
    cloud_score: number;
    kubernetes_score: number;
    total_controls: number;
    passed_controls: number;
  }>;
  resource_correlation: Array<{
    resource_id: string;
    resource_name: string;
    endpoint_id?: string;
    cloud_resource_id?: string;
    correlation_confidence: number;
    compliance_score: number;
  }>;
  gap_analysis: {
    endpoint_only_controls: number;
    cloud_only_controls: number;
    overlapping_controls: number;
    coverage_percentage: number;
  };
  timestamp: string;
}

/**
 * Service for calculating unified compliance scores across endpoint and cloud resources
 * Provides holistic security posture view combining CSP and endpoint compliance
 */
export class CSPUnifiedScoringService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  /**
   * Calculate unified compliance score across all posture types
   * @param weights - Optional custom weights for each component (default: equal weighting)
   */
  async calculateUnifiedScore(weights?: {
    endpoint?: number;
    cloud?: number;
    kubernetes?: number;
  }): Promise<UnifiedComplianceScore> {
    this.logger.info('Calculating unified compliance score');

    // Default weights (can be customized)
    const defaultWeights = {
      endpoint: weights?.endpoint ?? 0.4, // 40%
      cloud: weights?.cloud ?? 0.4, // 40%
      kubernetes: weights?.kubernetes ?? 0.2, // 20%
    };

    // Normalize weights to sum to 1.0
    const totalWeight =
      defaultWeights.endpoint + defaultWeights.cloud + defaultWeights.kubernetes;
    const normalizedWeights = {
      endpoint: defaultWeights.endpoint / totalWeight,
      cloud: defaultWeights.cloud / totalWeight,
      kubernetes: defaultWeights.kubernetes / totalWeight,
    };

    // Fetch component scores in parallel
    const [endpointScore, cloudScore, kubernetesScore] = await Promise.all([
      this.getEndpointComplianceScore(),
      this.getCloudComplianceScore(),
      this.getKubernetesComplianceScore(),
    ]);

    // Calculate weighted overall score
    const overallScore =
      endpointScore.score * normalizedWeights.endpoint +
      cloudScore.score * normalizedWeights.cloud +
      kubernetesScore.score * normalizedWeights.kubernetes;

    // Get framework-level scores
    const frameworkScores = await this.calculateFrameworkScores();

    // Get resource correlations
    const correlations = await this.correlateResources();

    // Calculate gap analysis
    const gapAnalysis = await this.analyzeControlGaps();

    return {
      overall_score: Math.round(overallScore * 10) / 10,
      component_scores: {
        endpoint: {
          score: endpointScore.score,
          weight: normalizedWeights.endpoint,
          total_findings: endpointScore.total,
          passed: endpointScore.passed,
          failed: endpointScore.failed,
        },
        cloud: {
          score: cloudScore.score,
          weight: normalizedWeights.cloud,
          total_findings: cloudScore.total,
          passed: cloudScore.passed,
          failed: cloudScore.failed,
        },
        kubernetes: {
          score: kubernetesScore.score,
          weight: normalizedWeights.kubernetes,
          total_findings: kubernetesScore.total,
          passed: kubernetesScore.passed,
          failed: kubernetesScore.failed,
        },
      },
      by_framework: frameworkScores,
      resource_correlation: correlations,
      gap_analysis: gapAnalysis,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get endpoint compliance score
   */
  private async getEndpointComplianceScore() {
    try {
      const response = await this.esClient.search({
        index: 'compliance-findings-latest-*',
        body: {
          size: 0,
          aggs: {
            passed: {
              filter: { term: { 'result.evaluation': 'passed' } },
            },
            failed: {
              filter: { term: { 'result.evaluation': 'failed' } },
            },
          },
        },
      });

      const passed = (response.aggregations?.passed as any)?.doc_count || 0;
      const failed = (response.aggregations?.failed as any)?.doc_count || 0;
      const total = passed + failed;

      return {
        score: total > 0 ? (passed / total) * 100 : 0,
        total,
        passed,
        failed,
      };
    } catch (error) {
      this.logger.error('Failed to get endpoint score', error);
      return { score: 0, total: 0, passed: 0, failed: 0 };
    }
  }

  /**
   * Get cloud compliance score from CSP
   */
  private async getCloudComplianceScore() {
    try {
      const response = await this.esClient.search({
        index: 'logs-cloud_security_posture.findings-*',
        body: {
          size: 0,
          query: {
            bool: {
              must: [{ term: { 'rule.benchmark.posture_type': 'cspm' } }],
            },
          },
          aggs: {
            passed: {
              filter: { term: { 'result.evaluation': 'passed' } },
            },
            failed: {
              filter: { term: { 'result.evaluation': 'failed' } },
            },
          },
        },
      });

      const passed = (response.aggregations?.passed as any)?.doc_count || 0;
      const failed = (response.aggregations?.failed as any)?.doc_count || 0;
      const total = passed + failed;

      return {
        score: total > 0 ? (passed / total) * 100 : 0,
        total,
        passed,
        failed,
      };
    } catch (error) {
      this.logger.debug('CSP cloud data not available', error);
      return { score: 0, total: 0, passed: 0, failed: 0 };
    }
  }

  /**
   * Get Kubernetes compliance score from CSP
   */
  private async getKubernetesComplianceScore() {
    try {
      const response = await this.esClient.search({
        index: 'logs-cloud_security_posture.findings-*',
        body: {
          size: 0,
          query: {
            bool: {
              must: [{ term: { 'rule.benchmark.posture_type': 'kspm' } }],
            },
          },
          aggs: {
            passed: {
              filter: { term: { 'result.evaluation': 'passed' } },
            },
            failed: {
              filter: { term: { 'result.evaluation': 'failed' } },
            },
          },
        },
      });

      const passed = (response.aggregations?.passed as any)?.doc_count || 0;
      const failed = (response.aggregations?.failed as any)?.doc_count || 0;
      const total = passed + failed;

      return {
        score: total > 0 ? (passed / total) * 100 : 0,
        total,
        passed,
        failed,
      };
    } catch (error) {
      this.logger.debug('CSP Kubernetes data not available', error);
      return { score: 0, total: 0, passed: 0, failed: 0 };
    }
  }

  /**
   * Calculate compliance scores by framework (CIS, PCI-DSS, ISO27001, etc.)
   */
  private async calculateFrameworkScores() {
    const frameworks = ['cis', 'pci-dss', 'iso27001', 'nist', 'soc2'];
    const scores = [];

    for (const framework of frameworks) {
      const score = await this.getFrameworkScore(framework);
      if (score.total_controls > 0) {
        scores.push(score);
      }
    }

    return scores;
  }

  /**
   * Get score for specific framework across all posture types
   */
  private async getFrameworkScore(framework: string) {
    const [endpoint, cloud, kubernetes] = await Promise.all([
      this.getFrameworkScoreForPostureType(framework, 'endpoint'),
      this.getFrameworkScoreForPostureType(framework, 'cloud'),
      this.getFrameworkScoreForPostureType(framework, 'kubernetes'),
    ]);

    const totalPassed = endpoint.passed + cloud.passed + kubernetes.passed;
    const totalControls = endpoint.total + cloud.total + kubernetes.total;

    return {
      framework: framework as any,
      overall_score: totalControls > 0 ? (totalPassed / totalControls) * 100 : 0,
      endpoint_score: endpoint.score,
      cloud_score: cloud.score,
      kubernetes_score: kubernetes.score,
      total_controls: totalControls,
      passed_controls: totalPassed,
    };
  }

  /**
   * Get framework score for specific posture type
   */
  private async getFrameworkScoreForPostureType(
    framework: string,
    postureType: 'endpoint' | 'cloud' | 'kubernetes'
  ) {
    const index =
      postureType === 'endpoint'
        ? 'compliance-findings-latest-*'
        : 'logs-cloud_security_posture.findings-*';

    try {
      const response = await this.esClient.search({
        index,
        body: {
          size: 0,
          query: {
            bool: {
              must: [
                {
                  nested: {
                    path: 'rule.frameworks',
                    query: {
                      term: { 'rule.frameworks.id': framework },
                    },
                  },
                },
              ],
            },
          },
          aggs: {
            passed: {
              filter: { term: { 'result.evaluation': 'passed' } },
            },
            failed: {
              filter: { term: { 'result.evaluation': 'failed' } },
            },
          },
        },
      });

      const passed = (response.aggregations?.passed as any)?.doc_count || 0;
      const failed = (response.aggregations?.failed as any)?.doc_count || 0;
      const total = passed + failed;

      return {
        score: total > 0 ? (passed / total) * 100 : 0,
        total,
        passed,
        failed: failed,
      };
    } catch (error) {
      return { score: 0, total: 0, passed: 0, failed: 0 };
    }
  }

  /**
   * Correlate cloud resources with endpoints
   * Example: EC2 instance → matches endpoint by IP address
   */
  private async correlateResources() {
    try {
      // Get endpoints with their IPs
      const endpoints = await this.esClient.search({
        index: 'compliance-findings-latest-*',
        body: {
          size: 0,
          aggs: {
            by_host: {
              terms: {
                field: 'host.id',
                size: 100,
              },
              aggs: {
                ips: {
                  terms: {
                    field: 'host.ip',
                    size: 10,
                  },
                },
                compliance_score: {
                  avg: {
                    script: {
                      source: "doc['result.evaluation'].value == 'passed' ? 100 : 0",
                    },
                  },
                },
              },
            },
          },
        },
      });

      const correlations = [];
      const hostBuckets = (endpoints.aggregations?.by_host as any)?.buckets || [];

      for (const bucket of hostBuckets) {
        const hostId = bucket.key;
        const ips = bucket.ips.buckets.map((b: any) => b.key);
        const score = bucket.compliance_score.value;

        // Try to find matching cloud resources by IP
        const cloudResource = await this.findCloudResourceByIP(ips);

        correlations.push({
          resource_id: hostId,
          resource_name: hostId,
          endpoint_id: hostId,
          cloud_resource_id: cloudResource?.id,
          correlation_confidence: cloudResource ? 0.9 : 0.0,
          compliance_score: score,
        });
      }

      return correlations;
    } catch (error) {
      this.logger.error('Resource correlation failed', error);
      return [];
    }
  }

  /**
   * Find cloud resource matching IP address
   */
  private async findCloudResourceByIP(ips: string[]) {
    if (ips.length === 0) return null;

    try {
      const response = await this.esClient.search({
        index: 'logs-cloud_security_posture.findings-*',
        body: {
          size: 1,
          query: {
            bool: {
              should: ips.map((ip) => ({
                term: { 'resource.ip_address': ip },
              })),
            },
          },
        },
      });

      if (response.hits.total.value > 0) {
        const hit = response.hits.hits[0]._source as any;
        return {
          id: hit.resource?.id,
          name: hit.resource?.name,
          type: hit.resource?.type,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze control coverage gaps between endpoint and cloud
   */
  private async analyzeControlGaps() {
    try {
      // Get endpoint controls
      const endpointControls = await this.esClient.search({
        index: 'compliance-findings-latest-*',
        body: {
          size: 0,
          aggs: {
            controls: {
              nested: {
                path: 'rule.frameworks',
              },
              aggs: {
                control_ids: {
                  terms: {
                    field: 'rule.frameworks.control.keyword',
                    size: 1000,
                  },
                },
              },
            },
          },
        },
      });

      // Get cloud controls
      const cloudControls = await this.esClient.search({
        index: 'logs-cloud_security_posture.findings-*',
        body: {
          size: 0,
          aggs: {
            control_ids: {
              terms: {
                field: 'rule.benchmark.rule_number.keyword',
                size: 1000,
              },
            },
          },
        },
      });

      const endpointControlSet = new Set(
        ((endpointControls.aggregations?.controls as any)?.control_ids?.buckets || []).map(
          (b: any) => b.key
        )
      );

      const cloudControlSet = new Set(
        (cloudControls.aggregations?.control_ids as any)?.buckets?.map((b: any) => b.key) || []
      );

      const overlapping = new Set(
        [...endpointControlSet].filter((c) => cloudControlSet.has(c))
      );

      const endpointOnly = endpointControlSet.size - overlapping.size;
      const cloudOnly = cloudControlSet.size - overlapping.size;
      const totalControls = endpointControlSet.size + cloudControlSet.size - overlapping.size;

      return {
        endpoint_only_controls: endpointOnly,
        cloud_only_controls: cloudOnly,
        overlapping_controls: overlapping.size,
        coverage_percentage: totalControls > 0 ? (overlapping.size / totalControls) * 100 : 0,
      };
    } catch (error) {
      this.logger.error('Gap analysis failed', error);
      return {
        endpoint_only_controls: 0,
        cloud_only_controls: 0,
        overlapping_controls: 0,
        coverage_percentage: 0,
      };
    }
  }
}
