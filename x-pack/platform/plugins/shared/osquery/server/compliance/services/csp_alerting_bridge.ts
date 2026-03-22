/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';

export interface BidirectionalAlert {
  alert_id: string;
  source: 'endpoint_compliance' | 'cloud_security_posture';
  target: 'endpoint_compliance' | 'cloud_security_posture';
  correlation_type: 'same_control' | 'related_resource' | 'cascading_failure';
  confidence: number;
  metadata: {
    source_finding_id: string;
    target_rule_id?: string;
    framework_control?: string;
    resource_correlation?: {
      endpoint_id: string;
      cloud_resource_id: string;
    };
  };
  created_at: string;
}

/**
 * Service for bidirectional alerting between endpoint compliance and CSP
 * Creates detection rules when compliance findings correlate with cloud misconfigurations
 */
export class CSPAlertingBridge {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly rulesClient: RulesClient | undefined,
    private readonly logger: Logger
  ) {}

  /**
   * Create bidirectional alert when endpoint finding correlates with cloud issue
   * Example: Failed endpoint firewall check + cloud security group misconfiguration
   */
  async createCorrelatedAlert(params: {
    endpointFindingId: string;
    cspFindingId?: string;
    correlationType: 'same_control' | 'related_resource' | 'cascading_failure';
    frameworkControl?: string;
  }): Promise<BidirectionalAlert> {
    this.logger.info('Creating correlated alert', params);

    // Get endpoint finding
    const endpointFinding = await this.esClient.get({
      index: 'compliance-findings-latest-*',
      id: params.endpointFindingId,
    });

    const finding = endpointFinding._source as any;

    // Calculate correlation confidence
    const confidence = this.calculateCorrelationConfidence(
      params.correlationType,
      finding,
      params.frameworkControl
    );

    const alert: BidirectionalAlert = {
      alert_id: `alert-${Date.now()}`,
      source: 'endpoint_compliance',
      target: 'cloud_security_posture',
      correlation_type: params.correlationType,
      confidence,
      metadata: {
        source_finding_id: params.endpointFindingId,
        target_rule_id: params.cspFindingId,
        framework_control: params.frameworkControl,
      },
      created_at: new Date().toISOString(),
    };

    // Index correlation alert
    await this.esClient.index({
      index: 'compliance-correlation-alerts',
      document: alert,
    });

    // Optionally create detection rule
    if (confidence > 0.8 && this.rulesClient) {
      await this.createDetectionRule(alert);
    }

    return alert;
  }

  /**
   * Monitor for correlation opportunities
   * Identifies when endpoint and cloud findings share common framework controls
   */
  async detectCorrelationOpportunities(): Promise<
    Array<{
      framework_control: string;
      endpoint_failures: number;
      cloud_failures: number;
      correlation_strength: 'high' | 'medium' | 'low';
      recommended_action: string;
    }>
  > {
    this.logger.debug('Detecting correlation opportunities');

    try {
      // Get failed findings grouped by framework control
      const endpointFailed = await this.esClient.search({
        index: 'compliance-findings-latest-*',
        body: {
          size: 0,
          query: {
            term: { 'result.evaluation': 'failed' },
          },
          aggs: {
            by_control: {
              nested: {
                path: 'rule.frameworks',
              },
              aggs: {
                controls: {
                  terms: {
                    field: 'rule.frameworks.control.keyword',
                    size: 100,
                  },
                },
              },
            },
          },
        },
      });

      const cloudFailed = await this.esClient.search({
        index: 'logs-cloud_security_posture.findings-*',
        body: {
          size: 0,
          query: {
            term: { 'result.evaluation': 'failed' },
          },
          aggs: {
            controls: {
              terms: {
                field: 'rule.benchmark.rule_number.keyword',
                size: 100,
              },
            },
          },
        },
      });

      const endpointControls = new Map(
        ((endpointFailed.aggregations?.by_control as any)?.controls?.buckets || []).map(
          (b: any) => [b.key, b.doc_count]
        )
      );

      const cloudControls = new Map(
        (cloudFailed.aggregations?.controls as any)?.buckets?.map((b: any) => [
          b.key,
          b.doc_count,
        ]) || []
      );

      const opportunities = [];

      for (const [control, endpointCount] of endpointControls) {
        const cloudCount = cloudControls.get(control);

        if (cloudCount && cloudCount > 0) {
          const totalFailures = endpointCount + cloudCount;
          const strength: 'high' | 'medium' | 'low' =
            totalFailures > 20 ? 'high' : totalFailures > 10 ? 'medium' : 'low';

          opportunities.push({
            framework_control: control,
            endpoint_failures: endpointCount,
            cloud_failures: cloudCount,
            correlation_strength: strength,
            recommended_action:
              strength === 'high'
                ? 'Create unified detection rule - high correlation detected'
                : 'Monitor for trends - moderate correlation',
          });
        }
      }

      return opportunities.sort(
        (a, b) => a.endpoint_failures + a.cloud_failures - (b.endpoint_failures + b.cloud_failures)
      );
    } catch (error) {
      this.logger.error('Failed to detect correlations', error);
      return [];
    }
  }

  /**
   * Create detection rule from correlated alert
   */
  private async createDetectionRule(alert: BidirectionalAlert): Promise<void> {
    if (!this.rulesClient) {
      this.logger.warn('Rules client not available - cannot create detection rule');
      return;
    }

    try {
      this.logger.info('Creating detection rule from correlated alert', { alert_id: alert.alert_id });

      // TODO: Integrate with Elastic Security detection rules
      // Would create a rule that triggers when:
      // 1. Endpoint compliance fails for a control
      // 2. AND cloud resource fails same control
      // 3. AND resources are correlated (same IP, same account, etc.)

      // Placeholder implementation
      this.logger.debug('Detection rule creation pending full Security integration');
    } catch (error) {
      this.logger.error('Failed to create detection rule', error);
    }
  }

  /**
   * Calculate correlation confidence score
   */
  private calculateCorrelationConfidence(
    correlationType: string,
    finding: any,
    frameworkControl?: string
  ): number {
    let confidence = 0.5; // Base confidence

    if (correlationType === 'same_control' && frameworkControl) {
      confidence = 0.9; // High confidence for same framework control
    } else if (correlationType === 'related_resource') {
      confidence = 0.7; // Medium-high confidence for resource correlation
    } else if (correlationType === 'cascading_failure') {
      confidence = 0.6; // Medium confidence for cascading failures
    }

    // Boost confidence if finding has high severity
    if (finding.rule?.level === 1) {
      confidence = Math.min(1.0, confidence + 0.1);
    }

    return confidence;
  }
}
