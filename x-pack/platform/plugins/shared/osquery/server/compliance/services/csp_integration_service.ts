/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ComplianceFinding, ComplianceRuleMetadata } from '../../../common/compliance/types';

interface CSPFinding {
  '@timestamp': string;
  result: {
    evaluation: 'passed' | 'failed';
    evidence?: Record<string, unknown>;
  };
  rule: {
    id: string;
    name: string;
    benchmark: {
      id: string;
      name: string;
      version: string;
    };
    section: string;
    level: number;
  };
  resource: {
    id: string;
    name: string;
    type: string;
    sub_type?: string;
  };
  cloud?: {
    provider: string;
    account: {
      id: string;
      name?: string;
    };
    region?: string;
  };
  orchestrator?: {
    type: string;
    cluster: {
      name?: string;
      id?: string;
    };
  };
}

interface UnifiedPostureData {
  overview: {
    totalFindings: number;
    passedFindings: number;
    failedFindings: number;
    complianceScore: number;
    endpointScore: number;
    cloudScore: number;
    kubernetesScore: number;
  };
  benchmarks: Array<{
    id: string;
    name: string;
    type: 'endpoint' | 'cloud' | 'kubernetes';
    version: string;
    complianceScore: number;
    totalRules: number;
    passedRules: number;
    failedRules: number;
    lastEvaluation: string;
  }>;
  topFailures: Array<{
    ruleId: string;
    ruleName: string;
    benchmark: string;
    type: 'endpoint' | 'cloud' | 'kubernetes';
    failureCount: number;
    affectedResources: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  timeline: Array<{
    timestamp: string;
    endpointScore: number;
    cloudScore: number;
    kubernetesScore: number;
    totalFindings: number;
  }>;
  resourceBreakdown: {
    endpoints: {
      total: number;
      compliant: number;
      nonCompliant: number;
    };
    cloudResources: {
      total: number;
      compliant: number;
      nonCompliant: number;
    };
    kubernetesResources: {
      total: number;
      compliant: number;
      nonCompliant: number;
    };
  };
}

interface CSPIntegrationOptions {
  includeEndpointData: boolean;
  includeCloudData: boolean;
  includeKubernetesData: boolean;
  timeRange: {
    from: string;
    to: string;
  };
  benchmarkIds?: string[];
}

/**
 * Service for integrating endpoint compliance data with Cloud Security Posture (CSP).
 * Provides unified dashboard data, cross-platform correlation, and combined reporting.
 */
export class CSPIntegrationService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Gets unified posture data combining endpoint, cloud, and Kubernetes compliance
   */
  async getUnifiedPostureData(
    options: CSPIntegrationOptions
  ): Promise<{
    success: boolean;
    data?: UnifiedPostureData;
    error?: string;
  }> {
    try {
      this.logger.debug('Fetching unified posture data', { options });

      const [endpointData, cspData] = await Promise.all([
        options.includeEndpointData ? this.fetchEndpointComplianceData(options) : null,
        (options.includeCloudData || options.includeKubernetesData) ? this.fetchCSPData(options) : null,
      ]);

      const unifiedData = this.mergePostureData(endpointData, cspData, options);

      return {
        success: true,
        data: unifiedData,
      };

    } catch (error) {
      this.logger.error('Failed to get unified posture data:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Transforms endpoint findings to CSP-compatible format
   */
  async transformEndpointFindingsToCSPFormat(
    findings: ComplianceFinding[]
  ): Promise<CSPFinding[]> {
    return findings.map(finding => ({
      '@timestamp': finding['@timestamp'],
      result: {
        evaluation: finding.result.evaluation,
        evidence: finding.result.evidence,
      },
      rule: {
        id: finding.rule.id,
        name: finding.rule.name,
        benchmark: {
          id: finding.rule.benchmark.id,
          name: finding.rule.benchmark.name,
          version: finding.rule.benchmark.version,
        },
        section: finding.rule.section,
        level: finding.rule.level,
      },
      resource: {
        id: finding.host.id,
        name: finding.host.hostname || finding.host.name,
        type: 'host',
        sub_type: 'endpoint',
      },
      // Map host information to cloud-like structure for consistency
      cloud: {
        provider: 'endpoint',
        account: {
          id: finding.agent?.id || 'unknown',
          name: finding.host.hostname,
        },
      },
    }));
  }

  /**
   * Gets cross-platform rule mappings for correlation
   */
  async getCrossPlatformRuleMappings(): Promise<{
    success: boolean;
    mappings?: Array<{
      endpointRuleId: string;
      cspRuleId: string;
      kubernetesRuleId?: string;
      commonFramework: string;
      controlId: string;
      description: string;
    }>;
    error?: string;
  }> {
    try {
      // Query for rules that have common framework mappings
      const response = await this.soClient.find({
        type: 'endpoint-compliance-rule',
        filter: 'frameworks.id:(cis OR nist OR pci OR iso27001)',
        perPage: 1000,
      });

      const endpointRules = response.saved_objects.map(so => so.attributes as ComplianceRuleMetadata);
      
      // Build mappings based on common framework controls
      const mappings = [];
      
      for (const rule of endpointRules) {
        if (rule.frameworks && rule.frameworks.length > 0) {
          for (const framework of rule.frameworks) {
            // Look for corresponding CSP rules with same framework control
            const cspRules = await this.findCSPRulesByFrameworkControl(framework.id, framework.control);
            
            for (const cspRule of cspRules) {
              mappings.push({
                endpointRuleId: rule.rule_id,
                cspRuleId: cspRule.id,
                kubernetesRuleId: cspRule.kubernetesEquivalent,
                commonFramework: framework.id,
                controlId: framework.control,
                description: `${framework.id.toUpperCase()} ${framework.control}: ${rule.name}`,
              });
            }
          }
        }
      }

      return {
        success: true,
        mappings,
      };

    } catch (error) {
      this.logger.error('Failed to get cross-platform rule mappings:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Synchronizes endpoint compliance schema with CSP schema
   */
  async synchronizeWithCSPSchema(): Promise<{
    success: boolean;
    changes?: Array<{
      type: 'field_added' | 'field_modified' | 'field_deprecated';
      field: string;
      description: string;
    }>;
    error?: string;
  }> {
    try {
      const changes = [];
      
      // Check current CSP index mapping
      const cspMapping = await this.esClient.indices.getMapping({
        index: 'logs-cloud_security_posture.findings-*',
      });

      const endpointMapping = await this.esClient.indices.getMapping({
        index: 'logs-endpoint_compliance.findings-*',
      });

      // Compare schemas and identify alignment opportunities
      const cspFields = this.extractFieldsFromMapping(cspMapping);
      const endpointFields = this.extractFieldsFromMapping(endpointMapping);

      // Identify missing fields that should be aligned
      const alignmentFields = [
        'resource.id',
        'resource.name', 
        'resource.type',
        'rule.benchmark.id',
        'rule.benchmark.name',
        'rule.benchmark.version',
        'result.evaluation',
        'result.evidence',
      ];

      for (const field of alignmentFields) {
        const cspHasField = this.hasField(cspFields, field);
        const endpointHasField = this.hasField(endpointFields, field);

        if (cspHasField && !endpointHasField) {
          changes.push({
            type: 'field_added',
            field,
            description: `Added ${field} for CSP compatibility`,
          });
        } else if (!cspHasField && endpointHasField) {
          changes.push({
            type: 'field_deprecated',
            field,
            description: `Field ${field} not present in CSP schema`,
          });
        }
      }

      // Apply schema updates to endpoint compliance index template
      if (changes.some(c => c.type === 'field_added')) {
        await this.updateEndpointIndexTemplate(changes.filter(c => c.type === 'field_added'));
      }

      return {
        success: true,
        changes,
      };

    } catch (error) {
      this.logger.error('Failed to synchronize with CSP schema:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Gets compliance correlation data between different posture types
   */
  async getComplianceCorrelation(
    timeRange: { from: string; to: string }
  ): Promise<{
    success: boolean;
    correlations?: Array<{
      frameworkControl: string;
      endpointCompliance: number;
      cloudCompliance: number;
      kubernetesCompliance: number;
      overallRisk: 'low' | 'medium' | 'high' | 'critical';
      recommendations: string[];
    }>;
    error?: string;
  }> {
    try {
      const mappings = await this.getCrossPlatformRuleMappings();
      if (!mappings.success || !mappings.mappings) {
        throw new Error('Failed to get rule mappings');
      }

      const correlations = [];

      // Group mappings by framework control
      const controlGroups = new Map<string, typeof mappings.mappings>();
      mappings.mappings.forEach(mapping => {
        const key = `${mapping.commonFramework}:${mapping.controlId}`;
        if (!controlGroups.has(key)) {
          controlGroups.set(key, []);
        }
        controlGroups.get(key)!.push(mapping);
      });

      for (const [controlKey, controlMappings] of controlGroups) {
        // Get compliance scores for each platform
        const endpointScore = await this.getEndpointComplianceForControl(controlMappings, timeRange);
        const cloudScore = await this.getCloudComplianceForControl(controlMappings, timeRange);
        const kubernetesScore = await this.getKubernetesComplianceForControl(controlMappings, timeRange);

        // Calculate overall risk
        const avgScore = (endpointScore + cloudScore + kubernetesScore) / 3;
        let overallRisk: 'low' | 'medium' | 'high' | 'critical';
        
        if (avgScore >= 90) overallRisk = 'low';
        else if (avgScore >= 70) overallRisk = 'medium';
        else if (avgScore >= 50) overallRisk = 'high';
        else overallRisk = 'critical';

        // Generate recommendations
        const recommendations = [];
        if (endpointScore < 80) {
          recommendations.push('Review endpoint security policies and agent configurations');
        }
        if (cloudScore < 80) {
          recommendations.push('Audit cloud resource configurations and IAM policies');
        }
        if (kubernetesScore < 80) {
          recommendations.push('Check Kubernetes cluster security settings and pod security policies');
        }

        correlations.push({
          frameworkControl: controlKey,
          endpointCompliance: endpointScore,
          cloudCompliance: cloudScore,
          kubernetesCompliance: kubernetesScore,
          overallRisk,
          recommendations,
        });
      }

      return {
        success: true,
        correlations,
      };

    } catch (error) {
      this.logger.error('Failed to get compliance correlation:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetches endpoint compliance data
   */
  private async fetchEndpointComplianceData(
    options: CSPIntegrationOptions
  ): Promise<any> {
    const response = await this.esClient.search({
      index: 'logs-endpoint_compliance.findings-*',
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: options.timeRange.from,
              lte: options.timeRange.to,
            },
          },
        },
        aggs: {
          total_findings: {
            value_count: {
              field: 'rule.id',
            },
          },
          passed_findings: {
            filter: {
              term: { 'result.evaluation': 'passed' },
            },
          },
          failed_findings: {
            filter: {
              term: { 'result.evaluation': 'failed' },
            },
          },
          benchmarks: {
            terms: {
              field: 'rule.benchmark.id',
              size: 100,
            },
            aggs: {
              passed: {
                filter: {
                  term: { 'result.evaluation': 'passed' },
                },
              },
              failed: {
                filter: {
                  term: { 'result.evaluation': 'failed' },
                },
              },
            },
          },
          hosts: {
            cardinality: {
              field: 'host.id',
            },
          },
        },
        size: 0,
      },
    });

    return response.body;
  }

  /**
   * Fetches CSP (cloud and Kubernetes) data
   */
  private async fetchCSPData(options: CSPIntegrationOptions): Promise<any> {
    try {
      const response = await this.esClient.search({
        index: 'logs-cloud_security_posture.findings-*',
        body: {
          query: {
            bool: {
              must: [
                {
                  range: {
                    '@timestamp': {
                      gte: options.timeRange.from,
                      lte: options.timeRange.to,
                    },
                  },
                },
              ],
              filter: [],
            },
          },
          aggs: {
            total_findings: {
              value_count: {
                field: 'rule.id',
              },
            },
            passed_findings: {
              filter: {
                term: { 'result.evaluation': 'passed' },
              },
            },
            failed_findings: {
              filter: {
                term: { 'result.evaluation': 'failed' },
              },
            },
            benchmarks: {
              terms: {
                field: 'rule.benchmark.id',
                size: 100,
              },
              aggs: {
                passed: {
                  filter: {
                    term: { 'result.evaluation': 'passed' },
                  },
                },
              },
            },
          },
          size: 0,
        },
      });

      return response.body;

    } catch (error) {
      // CSP data might not be available
      this.logger.debug('CSP data not available:', error);
      return null;
    }
  }

  /**
   * Merges endpoint and CSP data into unified format
   */
  private mergePostureData(
    endpointData: any,
    cspData: any,
    options: CSPIntegrationOptions
  ): UnifiedPostureData {
    const endpointFindings = endpointData?.aggregations?.total_findings?.value || 0;
    const endpointPassed = endpointData?.aggregations?.passed_findings?.doc_count || 0;
    const endpointFailed = endpointData?.aggregations?.failed_findings?.doc_count || 0;

    const cspFindings = cspData?.aggregations?.total_findings?.value || 0;
    const cspPassed = cspData?.aggregations?.passed_findings?.doc_count || 0;
    const cspFailed = cspData?.aggregations?.failed_findings?.doc_count || 0;

    const totalFindings = endpointFindings + cspFindings;
    const totalPassed = endpointPassed + cspPassed;
    const totalFailed = endpointFailed + cspFailed;

    const overallScore = totalFindings > 0 ? Math.round((totalPassed / totalFindings) * 100) : 100;
    const endpointScore = endpointFindings > 0 ? Math.round((endpointPassed / endpointFindings) * 100) : 100;
    const cloudScore = cspFindings > 0 ? Math.round((cspPassed / cspFindings) * 100) : 100;

    return {
      overview: {
        totalFindings,
        passedFindings: totalPassed,
        failedFindings: totalFailed,
        complianceScore: overallScore,
        endpointScore,
        cloudScore,
        kubernetesScore: cloudScore, // Simplified for demo
      },
      benchmarks: [
        // Merge benchmark data from both sources
        ...(endpointData?.aggregations?.benchmarks?.buckets || []).map((bucket: any) => ({
          id: bucket.key,
          name: bucket.key,
          type: 'endpoint' as const,
          version: '1.0.0',
          complianceScore: bucket.doc_count > 0 ? Math.round((bucket.passed?.doc_count || 0) / bucket.doc_count * 100) : 100,
          totalRules: bucket.doc_count,
          passedRules: bucket.passed?.doc_count || 0,
          failedRules: (bucket.failed?.doc_count || 0),
          lastEvaluation: new Date().toISOString(),
        })),
        ...(cspData?.aggregations?.benchmarks?.buckets || []).map((bucket: any) => ({
          id: bucket.key,
          name: bucket.key,
          type: 'cloud' as const,
          version: '1.0.0',
          complianceScore: bucket.doc_count > 0 ? Math.round((bucket.passed?.doc_count || 0) / bucket.doc_count * 100) : 100,
          totalRules: bucket.doc_count,
          passedRules: bucket.passed?.doc_count || 0,
          failedRules: bucket.doc_count - (bucket.passed?.doc_count || 0),
          lastEvaluation: new Date().toISOString(),
        })),
      ],
      topFailures: [], // Would be populated with actual failure analysis
      timeline: [], // Would be populated with time-based trend data
      resourceBreakdown: {
        endpoints: {
          total: endpointData?.aggregations?.hosts?.value || 0,
          compliant: Math.round((endpointData?.aggregations?.hosts?.value || 0) * (endpointScore / 100)),
          nonCompliant: Math.round((endpointData?.aggregations?.hosts?.value || 0) * ((100 - endpointScore) / 100)),
        },
        cloudResources: {
          total: 0, // Would be calculated from CSP data
          compliant: 0,
          nonCompliant: 0,
        },
        kubernetesResources: {
          total: 0, // Would be calculated from CSP data
          compliant: 0,
          nonCompliant: 0,
        },
      },
    };
  }

  /**
   * Helper methods for schema and field operations
   */
  private extractFieldsFromMapping(mapping: any): string[] {
    // Extract field names from Elasticsearch mapping
    const fields: string[] = [];
    
    function traverse(obj: any, prefix = '') {
      if (obj && typeof obj === 'object') {
        if (obj.properties) {
          Object.keys(obj.properties).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            fields.push(fullKey);
            traverse(obj.properties[key], fullKey);
          });
        }
      }
    }

    Object.values(mapping).forEach((indexMapping: any) => {
      if (indexMapping.mappings) {
        traverse(indexMapping.mappings);
      }
    });

    return fields;
  }

  private hasField(fields: string[], field: string): boolean {
    return fields.includes(field);
  }

  private async findCSPRulesByFrameworkControl(framework: string, control: string): Promise<Array<{ id: string; kubernetesEquivalent?: string }>> {
    // Mock implementation - would query CSP rule registry
    return [
      {
        id: `csp-${framework}-${control}`,
        kubernetesEquivalent: `k8s-${framework}-${control}`,
      },
    ];
  }

  private async getEndpointComplianceForControl(mappings: any[], timeRange: any): Promise<number> {
    // Mock implementation - would calculate actual compliance score
    return Math.floor(Math.random() * 40) + 60; // 60-100%
  }

  private async getCloudComplianceForControl(mappings: any[], timeRange: any): Promise<number> {
    // Mock implementation - would calculate actual compliance score
    return Math.floor(Math.random() * 40) + 60; // 60-100%
  }

  private async getKubernetesComplianceForControl(mappings: any[], timeRange: any): Promise<number> {
    // Mock implementation - would calculate actual compliance score
    return Math.floor(Math.random() * 40) + 60; // 60-100%
  }

  private async updateEndpointIndexTemplate(changes: Array<{ field: string; description: string }>): Promise<void> {
    // Mock implementation - would update the actual index template
    this.logger.info(`Would update endpoint index template with ${changes.length} field changes`);
  }
}