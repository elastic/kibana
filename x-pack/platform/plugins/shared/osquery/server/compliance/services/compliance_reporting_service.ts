/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ReportingPluginSetup } from '@kbn/reporting-plugin/server';
import { ElasticsearchClient } from '@kbn/core/server';
import type { ComplianceRuleMetadata, ComplianceFinding } from '../../../common/compliance/types';
import { ComplianceScoringService } from './compliance_scoring_service';

interface ComplianceReportOptions {
  format: 'pdf' | 'csv' | 'json';
  timeRange: {
    from: string;
    to: string;
  };
  filters?: {
    benchmarkIds?: string[];
    hostIds?: string[];
    ruleIds?: string[];
    platforms?: string[];
    complianceStatus?: Array<'passed' | 'failed' | 'not_applicable'>;
  };
  includeDetails?: boolean;
  includeEvidence?: boolean;
  groupBy?: 'host' | 'rule' | 'benchmark';
  sortBy?: 'timestamp' | 'compliance_score' | 'rule_name' | 'host_name';
  sortOrder?: 'asc' | 'desc';
}

interface ComplianceReportData {
  metadata: {
    reportId: string;
    generatedAt: string;
    generatedBy: string;
    timeRange: ComplianceReportOptions['timeRange'];
    filters: ComplianceReportOptions['filters'];
    totalHosts: number;
    totalRules: number;
    totalFindings: number;
  };
  summary: {
    overallComplianceScore: number;
    benchmarkScores: Array<{
      benchmarkId: string;
      benchmarkName: string;
      complianceScore: number;
      totalRules: number;
      passedRules: number;
      failedRules: number;
    }>;
    hostSummary: Array<{
      hostId: string;
      hostname: string;
      complianceScore: number;
      totalFindings: number;
      passedFindings: number;
      failedFindings: number;
    }>;
    topFailures: Array<{
      ruleId: string;
      ruleName: string;
      failureRate: number;
      affectedHosts: number;
    }>;
  };
  findings: ComplianceFinding[];
  rules: ComplianceRuleMetadata[];
}

interface ReportJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  createdAt: string;
  completedAt?: string;
  error?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

/**
 * Service for generating comprehensive compliance reports in multiple formats.
 * Integrates with Kibana Reporting plugin for PDF generation and provides
 * CSV/JSON export capabilities with flexible filtering and grouping options.
 */
export class ComplianceReportingService {
  private readonly reportJobs = new Map<string, ReportJobStatus>();

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger,
    private readonly reporting: ReportingPluginSetup,
    private readonly scoringService: ComplianceScoringService
  ) {}

  /**
   * Initiates report generation and returns job tracking information
   */
  async generateReport(
    options: ComplianceReportOptions,
    requestedBy: string
  ): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
  }> {
    try {
      const jobId = `compliance-report-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Initialize job status
      const jobStatus: ReportJobStatus = {
        jobId,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      this.reportJobs.set(jobId, jobStatus);
      this.logger.info(`Initiated compliance report generation: ${jobId}`);

      // Start async report generation
      this.processReportGeneration(jobId, options, requestedBy).catch(error => {
        this.logger.error(`Report generation failed for job ${jobId}:`, error);
        this.updateJobStatus(jobId, { 
          status: 'failed', 
          error: error.message,
          completedAt: new Date().toISOString(),
        });
      });

      return {
        success: true,
        jobId,
      };

    } catch (error) {
      this.logger.error('Failed to initiate report generation:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Gets the status of a report generation job
   */
  getReportStatus(jobId: string): ReportJobStatus | null {
    return this.reportJobs.get(jobId) || null;
  }

  /**
   * Lists all report jobs for a user (would integrate with user context)
   */
  listReportJobs(): ReportJobStatus[] {
    const now = new Date().getTime();
    
    // Clean up expired jobs
    for (const [jobId, job] of this.reportJobs.entries()) {
      if (job.expiresAt && new Date(job.expiresAt).getTime() < now) {
        this.reportJobs.delete(jobId);
      }
    }

    return Array.from(this.reportJobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Cancels a pending or processing report job
   */
  async cancelReport(jobId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const job = this.reportJobs.get(jobId);
    
    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return { success: false, error: 'Cannot cancel completed or failed job' };
    }

    this.updateJobStatus(jobId, {
      status: 'failed',
      error: 'Cancelled by user',
      completedAt: new Date().toISOString(),
    });

    this.logger.info(`Report job cancelled: ${jobId}`);
    
    return { success: true };
  }

  /**
   * Processes report generation asynchronously
   */
  private async processReportGeneration(
    jobId: string,
    options: ComplianceReportOptions,
    requestedBy: string
  ): Promise<void> {
    this.updateJobStatus(jobId, { status: 'processing', progress: 10 });

    // Step 1: Gather report data
    this.logger.debug(`Gathering report data for job ${jobId}`);
    const reportData = await this.gatherReportData(jobId, options);

    this.updateJobStatus(jobId, { progress: 50 });

    // Step 2: Generate report in requested format
    this.logger.debug(`Generating ${options.format} report for job ${jobId}`);
    let downloadUrl: string;

    switch (options.format) {
      case 'pdf':
        downloadUrl = await this.generatePdfReport(jobId, reportData, options, requestedBy);
        break;
      case 'csv':
        downloadUrl = await this.generateCsvReport(jobId, reportData, options);
        break;
      case 'json':
        downloadUrl = await this.generateJsonReport(jobId, reportData, options);
        break;
      default:
        throw new Error(`Unsupported report format: ${options.format}`);
    }

    this.updateJobStatus(jobId, { 
      status: 'completed', 
      progress: 100,
      completedAt: new Date().toISOString(),
      downloadUrl,
    });

    this.logger.info(`Report generation completed for job ${jobId}`);
  }

  /**
   * Gathers all data needed for the report
   */
  private async gatherReportData(
    jobId: string,
    options: ComplianceReportOptions
  ): Promise<ComplianceReportData> {
    const { timeRange, filters } = options;

    // Build Elasticsearch query
    const query: any = {
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: timeRange.from,
                lte: timeRange.to,
              },
            },
          },
        ],
      },
    };

    // Apply filters
    if (filters) {
      if (filters.benchmarkIds && filters.benchmarkIds.length > 0) {
        query.bool.must.push({
          terms: { 'rule.benchmark.id': filters.benchmarkIds },
        });
      }

      if (filters.hostIds && filters.hostIds.length > 0) {
        query.bool.must.push({
          terms: { 'host.id': filters.hostIds },
        });
      }

      if (filters.ruleIds && filters.ruleIds.length > 0) {
        query.bool.must.push({
          terms: { 'rule.id': filters.ruleIds },
        });
      }

      if (filters.platforms && filters.platforms.length > 0) {
        query.bool.must.push({
          terms: { 'host.os.platform': filters.platforms },
        });
      }

      if (filters.complianceStatus && filters.complianceStatus.length > 0) {
        query.bool.must.push({
          terms: { 'result.evaluation': filters.complianceStatus },
        });
      }
    }

    // Fetch findings
    this.updateJobStatus(jobId, { progress: 20 });
    const findings = await this.fetchFindings(query, options);

    // Fetch rules metadata
    this.updateJobStatus(jobId, { progress: 30 });
    const rules = await this.fetchRulesMetadata(filters?.ruleIds);

    // Generate summary statistics
    this.updateJobStatus(jobId, { progress: 40 });
    const summary = await this.generateSummaryStats(findings, rules, options);

    return {
      metadata: {
        reportId: jobId,
        generatedAt: new Date().toISOString(),
        generatedBy: 'compliance-reporting-service',
        timeRange,
        filters: filters || {},
        totalHosts: summary.hostSummary.length,
        totalRules: rules.length,
        totalFindings: findings.length,
      },
      summary,
      findings,
      rules,
    };
  }

  /**
   * Fetches compliance findings based on query
   */
  private async fetchFindings(query: any, options: ComplianceReportOptions): Promise<ComplianceFinding[]> {
    try {
      const response = await this.esClient.search({
        index: 'logs-endpoint_compliance.findings-*',
        body: {
          query,
          sort: [
            { '@timestamp': { order: options.sortOrder || 'desc' } }
          ],
          size: 10000, // Limit for large reports
          _source: {
            excludes: options.includeEvidence ? [] : ['result.evidence'],
          },
        },
      });

      return response.body.hits.hits.map((hit: any) => hit._source);

    } catch (error) {
      this.logger.error('Failed to fetch findings for report:', error);
      return [];
    }
  }

  /**
   * Fetches rules metadata
   */
  private async fetchRulesMetadata(ruleIds?: string[]): Promise<ComplianceRuleMetadata[]> {
    try {
      let filter: any = {};
      
      if (ruleIds && ruleIds.length > 0) {
        filter = {
          terms: { rule_id: ruleIds },
        };
      }

      const response = await this.soClient.find<ComplianceRuleMetadata>({
        type: 'endpoint-compliance-rule',
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        perPage: 1000,
      });

      return response.saved_objects.map(so => so.attributes);

    } catch (error) {
      this.logger.error('Failed to fetch rules metadata for report:', error);
      return [];
    }
  }

  /**
   * Generates summary statistics for the report
   */
  private async generateSummaryStats(
    findings: ComplianceFinding[],
    rules: ComplianceRuleMetadata[],
    options: ComplianceReportOptions
  ): Promise<ComplianceReportData['summary']> {
    // Calculate overall compliance score
    const totalFindings = findings.length;
    const passedFindings = findings.filter(f => f.result.evaluation === 'passed').length;
    const overallComplianceScore = totalFindings > 0 ? Math.round((passedFindings / totalFindings) * 100) : 100;

    // Group by benchmark
    const benchmarkGroups = new Map<string, ComplianceFinding[]>();
    findings.forEach(finding => {
      const benchmarkId = finding.rule.benchmark.id;
      if (!benchmarkGroups.has(benchmarkId)) {
        benchmarkGroups.set(benchmarkId, []);
      }
      benchmarkGroups.get(benchmarkId)!.push(finding);
    });

    const benchmarkScores = Array.from(benchmarkGroups.entries()).map(([benchmarkId, benchmarkFindings]) => {
      const benchmarkPassed = benchmarkFindings.filter(f => f.result.evaluation === 'passed').length;
      const benchmarkTotal = benchmarkFindings.length;
      const complianceScore = benchmarkTotal > 0 ? Math.round((benchmarkPassed / benchmarkTotal) * 100) : 100;
      
      const benchmarkRules = new Set(benchmarkFindings.map(f => f.rule.id)).size;
      const benchmarkPassedRules = new Set(
        benchmarkFindings.filter(f => f.result.evaluation === 'passed').map(f => f.rule.id)
      ).size;

      return {
        benchmarkId,
        benchmarkName: benchmarkFindings[0]?.rule.benchmark.name || benchmarkId,
        complianceScore,
        totalRules: benchmarkRules,
        passedRules: benchmarkPassedRules,
        failedRules: benchmarkRules - benchmarkPassedRules,
      };
    });

    // Group by host
    const hostGroups = new Map<string, ComplianceFinding[]>();
    findings.forEach(finding => {
      const hostId = finding.host.id;
      if (!hostGroups.has(hostId)) {
        hostGroups.set(hostId, []);
      }
      hostGroups.get(hostId)!.push(finding);
    });

    const hostSummary = Array.from(hostGroups.entries()).map(([hostId, hostFindings]) => {
      const hostPassed = hostFindings.filter(f => f.result.evaluation === 'passed').length;
      const hostTotal = hostFindings.length;
      const complianceScore = hostTotal > 0 ? Math.round((hostPassed / hostTotal) * 100) : 100;

      return {
        hostId,
        hostname: hostFindings[0]?.host.hostname || hostId,
        complianceScore,
        totalFindings: hostTotal,
        passedFindings: hostPassed,
        failedFindings: hostTotal - hostPassed,
      };
    });

    // Calculate top failures
    const ruleFailures = new Map<string, { count: number; hosts: Set<string>; ruleName: string }>();
    findings.filter(f => f.result.evaluation === 'failed').forEach(finding => {
      const ruleId = finding.rule.id;
      if (!ruleFailures.has(ruleId)) {
        ruleFailures.set(ruleId, {
          count: 0,
          hosts: new Set(),
          ruleName: finding.rule.name,
        });
      }
      const ruleData = ruleFailures.get(ruleId)!;
      ruleData.count++;
      ruleData.hosts.add(finding.host.id);
    });

    const topFailures = Array.from(ruleFailures.entries())
      .map(([ruleId, data]) => ({
        ruleId,
        ruleName: data.ruleName,
        failureRate: Math.round((data.count / totalFindings) * 100),
        affectedHosts: data.hosts.size,
      }))
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 10); // Top 10 failures

    return {
      overallComplianceScore,
      benchmarkScores,
      hostSummary,
      topFailures,
    };
  }

  /**
   * Generates PDF report using Kibana Reporting
   */
  private async generatePdfReport(
    jobId: string,
    reportData: ComplianceReportData,
    options: ComplianceReportOptions,
    requestedBy: string
  ): Promise<string> {
    try {
      // Create HTML content for PDF generation
      const htmlContent = this.generateHtmlReport(reportData, options);

      // Use Kibana Reporting to generate PDF
      const pdfJob = await this.reporting.scheduleReport({
        jobtype: 'printable_pdf',
        title: `Compliance Report - ${reportData.metadata.reportId}`,
        objectType: 'compliance-report',
        browserTimezone: 'UTC',
        relativeUrls: [],
        layout: {
          id: 'preserve_layout',
          dimensions: { width: 1680, height: 950 },
        },
        version: '8.15.0', // Would use actual version
        jobParams: {
          title: `Compliance Report`,
          objectType: 'compliance-report',
          htmlContent,
        },
      });

      // Return a URL that can be used to download the PDF
      // This would be implemented based on Kibana Reporting's URL structure
      return `/api/reporting/jobs/download/${pdfJob._id}`;

    } catch (error) {
      this.logger.error(`Failed to generate PDF report for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Generates CSV report
   */
  private async generateCsvReport(
    jobId: string,
    reportData: ComplianceReportData,
    options: ComplianceReportOptions
  ): Promise<string> {
    try {
      const csvRows: string[] = [];

      // CSV Headers
      const headers = [
        'Timestamp',
        'Host ID',
        'Hostname',
        'Rule ID',
        'Rule Name',
        'Benchmark ID',
        'Benchmark Name',
        'Section',
        'Level',
        'Platform',
        'Evaluation',
        'Evidence Count',
      ];

      csvRows.push(headers.join(','));

      // Data rows
      reportData.findings.forEach(finding => {
        const row = [
          finding['@timestamp'],
          finding.host.id,
          finding.host.hostname || '',
          finding.rule.id,
          `"${finding.rule.name.replace(/"/g, '""')}"`, // Escape quotes
          finding.rule.benchmark.id,
          `"${finding.rule.benchmark.name.replace(/"/g, '""')}"`,
          finding.rule.section || '',
          finding.rule.level?.toString() || '',
          finding.host.os?.platform || '',
          finding.result.evaluation,
          finding.result.evidence ? Object.keys(finding.result.evidence).length : 0,
        ];

        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      
      // Save CSV content (would integrate with file storage)
      const downloadUrl = `/api/compliance/reports/${jobId}/download.csv`;
      
      // Store CSV content for download (simplified implementation)
      // In production, this would use proper file storage
      this.storeTempFile(jobId, csvContent, 'text/csv');

      return downloadUrl;

    } catch (error) {
      this.logger.error(`Failed to generate CSV report for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Generates JSON report
   */
  private async generateJsonReport(
    jobId: string,
    reportData: ComplianceReportData,
    options: ComplianceReportOptions
  ): Promise<string> {
    try {
      const jsonContent = JSON.stringify(reportData, null, 2);
      
      const downloadUrl = `/api/compliance/reports/${jobId}/download.json`;
      
      // Store JSON content for download
      this.storeTempFile(jobId, jsonContent, 'application/json');

      return downloadUrl;

    } catch (error) {
      this.logger.error(`Failed to generate JSON report for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Generates HTML content for PDF reports
   */
  private generateHtmlReport(reportData: ComplianceReportData, options: ComplianceReportOptions): string {
    const { metadata, summary } = reportData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Compliance Report - ${metadata.reportId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          .summary { margin-bottom: 30px; }
          .chart { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .score { font-size: 24px; font-weight: bold; color: ${summary.overallComplianceScore >= 80 ? '#28a745' : summary.overallComplianceScore >= 60 ? '#ffc107' : '#dc3545'}; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Endpoint Compliance Report</h1>
          <p><strong>Report ID:</strong> ${metadata.reportId}</p>
          <p><strong>Generated:</strong> ${new Date(metadata.generatedAt).toLocaleString()}</p>
          <p><strong>Time Range:</strong> ${new Date(metadata.timeRange.from).toLocaleString()} to ${new Date(metadata.timeRange.to).toLocaleString()}</p>
        </div>

        <div class="summary">
          <h2>Executive Summary</h2>
          <p>Overall Compliance Score: <span class="score">${summary.overallComplianceScore}%</span></p>
          <p>Total Findings: ${metadata.totalFindings}</p>
          <p>Hosts Evaluated: ${metadata.totalHosts}</p>
          <p>Rules Evaluated: ${metadata.totalRules}</p>
        </div>

        <h2>Benchmark Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Benchmark</th>
              <th>Compliance Score</th>
              <th>Total Rules</th>
              <th>Passed</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            ${summary.benchmarkScores.map(benchmark => `
              <tr>
                <td>${benchmark.benchmarkName}</td>
                <td>${benchmark.complianceScore}%</td>
                <td>${benchmark.totalRules}</td>
                <td style="color: #28a745;">${benchmark.passedRules}</td>
                <td style="color: #dc3545;">${benchmark.failedRules}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="page-break"></div>

        <h2>Host Compliance Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Hostname</th>
              <th>Compliance Score</th>
              <th>Total Findings</th>
              <th>Passed</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            ${summary.hostSummary.map(host => `
              <tr>
                <td>${host.hostname}</td>
                <td>${host.complianceScore}%</td>
                <td>${host.totalFindings}</td>
                <td style="color: #28a745;">${host.passedFindings}</td>
                <td style="color: #dc3545;">${host.failedFindings}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Top Compliance Issues</h2>
        <table>
          <thead>
            <tr>
              <th>Rule</th>
              <th>Failure Rate</th>
              <th>Affected Hosts</th>
            </tr>
          </thead>
          <tbody>
            ${summary.topFailures.map(failure => `
              <tr>
                <td>${failure.ruleName}</td>
                <td style="color: #dc3545;">${failure.failureRate}%</td>
                <td>${failure.affectedHosts}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Updates job status (simplified implementation)
   */
  private updateJobStatus(jobId: string, updates: Partial<ReportJobStatus>): void {
    const currentStatus = this.reportJobs.get(jobId);
    if (currentStatus) {
      this.reportJobs.set(jobId, { ...currentStatus, ...updates });
    }
  }

  /**
   * Stores temporary file for download (simplified implementation)
   */
  private storeTempFile(jobId: string, content: string, mimeType: string): void {
    // In production, this would store files in a secure temporary location
    // For now, we'll just log that the file would be stored
    this.logger.debug(`Storing temp file for job ${jobId}, size: ${content.length} bytes, type: ${mimeType}`);
  }
}