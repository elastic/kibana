/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import {
  COMPLIANCE_FINDINGS_DATA_STREAM,
  COMPLIANCE_SCHEDULE_ID_PREFIX,
  COMPLIANCE_RULE_SO_TYPE,
} from '../../../common/compliance';
import type { ComplianceRuleMetadata, ComplianceEvaluation } from '../../../common/compliance';
import { isComplianceScheduleId } from '../../../common/compliance';

const OSQUERY_RESULTS_INDEX = 'logs-osquery_manager.result-*';
const POLL_INTERVAL_MS = 30_000;
const MAX_RESULTS_PER_POLL = 500;

export class FindingEvaluatorService {
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastTimestamp: string;
  private readonly ruleCache = new Map<string, ComplianceRuleMetadata>();
  private cacheLastCleared = Date.now();
  private readonly CACHE_TTL_MS = 5 * 60_000;

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {
    this.lastTimestamp = new Date(Date.now() - 5 * 60_000).toISOString();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.logger.info('Finding evaluator service started');
    this.poll();
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    this.logger.info('Finding evaluator service stopped');
  }

  private schedulePoll(): void {
    if (!this.running) return;
    this.pollTimer = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    try {
      await this.processNewResults();
    } catch (error) {
      this.logger.error(`Finding evaluator poll error: ${error.message}`);
    }

    this.schedulePoll();
  }

  private async processNewResults(): Promise<void> {
    const response = await this.esClient.search({
      index: OSQUERY_RESULTS_INDEX,
      size: MAX_RESULTS_PER_POLL,
      query: {
        bool: {
          must: [
            { range: { '@timestamp': { gt: this.lastTimestamp } } },
            { prefix: { 'action_data.query.pack_id': COMPLIANCE_SCHEDULE_ID_PREFIX } },
          ],
        },
      },
      sort: [{ '@timestamp': 'asc' }],
    });

    const hits = response.hits.hits;
    if (hits.length === 0) return;

    const findingsByAction = new Map<string, { ruleId: string; results: any[] }>();

    for (const hit of hits) {
      const source = hit._source as any;
      const scheduleId = source?.action_data?.query?.pack_id ?? '';
      if (!isComplianceScheduleId(scheduleId)) continue;

      const ruleId = scheduleId.replace(COMPLIANCE_SCHEDULE_ID_PREFIX, '');
      const actionId = source?.action_id ?? hit._id;
      const key = `${actionId}:${ruleId}`;

      if (!findingsByAction.has(key)) {
        findingsByAction.set(key, { ruleId, results: [] });
      }

      findingsByAction.get(key)!.results.push(source);
    }

    const findingDocs: object[] = [];
    const now = new Date().toISOString();

    for (const [, { ruleId, results }] of findingsByAction) {
      const rule = await this.resolveRule(ruleId);
      if (!rule) {
        this.logger.warn(`No compliance rule found for schedule ID: ${ruleId}`);
        continue;
      }

      const hostMap = new Map<string, any[]>();
      for (const result of results) {
        const hostId = result?.host?.id ?? result?.agent?.id ?? 'unknown';
        if (!hostMap.has(hostId)) hostMap.set(hostId, []);
        hostMap.get(hostId)!.push(result);
      }

      for (const [hostId, hostResults] of hostMap) {
        const evaluation = this.evaluateResults(hostResults);
        const hostInfo = hostResults[0]?.host ?? {};
        const agentInfo = hostResults[0]?.agent ?? {};

        findingDocs.push({
          '@timestamp': now,
          result: {
            evaluation,
            evidence:
              evaluation === 'passed'
                ? { row_count: hostResults.length }
                : { row_count: 0, expected: 'at least 1 row' },
          },
          rule: {
            id: rule.rule_id,
            name: rule.name,
            description: rule.description,
            remediation: rule.remediation,
            benchmark: {
              ...rule.benchmark,
              rule_number: rule.rule_number,
            },
            section: rule.section,
            level: rule.level,
            frameworks: rule.frameworks,
            tags: rule.tags,
          },
          host: {
            id: hostId,
            name: hostInfo.hostname ?? hostInfo.name ?? hostId,
            os: {
              family: hostInfo.os?.family ?? '',
              name: hostInfo.os?.name ?? '',
              version: hostInfo.os?.version ?? '',
              platform: hostInfo.os?.platform ?? rule.platform,
            },
          },
          agent: {
            id: agentInfo.id ?? '',
            type: agentInfo.type ?? 'osquery',
            version: agentInfo.version ?? '',
          },
          resource: {
            type: rule.resource_type,
            sub_type: rule.section,
          },
          data_stream: {
            dataset: 'endpoint_compliance.findings',
            namespace: 'default',
            type: 'logs',
          },
        });
      }
    }

    if (findingDocs.length > 0) {
      const body = findingDocs.flatMap((doc) => [
        { create: { _index: COMPLIANCE_FINDINGS_DATA_STREAM } },
        doc,
      ]);
      const bulkResult = await this.esClient.bulk({ body, refresh: false });
      if (bulkResult.errors) {
        const errorItems = bulkResult.items.filter((item: any) => item.create?.error);
        this.logger.warn(`${errorItems.length} finding write errors out of ${findingDocs.length}`);
      }

      this.logger.info(`Ingested ${findingDocs.length} compliance findings`);
    }

    const lastHit = hits[hits.length - 1];
    this.lastTimestamp = (lastHit._source as any)?.['@timestamp'] ?? this.lastTimestamp;
  }

  /**
   * Convention: rows returned = passed, no rows = failed.
   * Query errors or missing tables = not_applicable.
   */
  private evaluateResults(results: any[]): ComplianceEvaluation {
    const hasError = results.some((r) => r?.error != null || r?.action_data?.error != null);
    if (hasError) return 'not_applicable';

    const dataRows = results.filter(
      (r) => r?.osquery?.result != null || r?.columns != null || r?.rows != null
    );

    return dataRows.length > 0 ? 'passed' : 'failed';
  }

  private async resolveRule(ruleId: string): Promise<ComplianceRuleMetadata | null> {
    if (Date.now() - this.cacheLastCleared > this.CACHE_TTL_MS) {
      this.ruleCache.clear();
      this.cacheLastCleared = Date.now();
    }

    if (this.ruleCache.has(ruleId)) return this.ruleCache.get(ruleId)!;

    try {
      const so = await this.soClient.get<ComplianceRuleMetadata>(COMPLIANCE_RULE_SO_TYPE, ruleId);
      this.ruleCache.set(ruleId, so.attributes);

      return so.attributes;
    } catch (error) {
      this.logger.warn(`Failed to resolve compliance rule ${ruleId}: ${error.message}`);

      return null;
    }
  }

  clearCache(): void {
    this.ruleCache.clear();
  }
}
