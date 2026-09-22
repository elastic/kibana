/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertEvent } from '../../../resources/datastreams/alert_events';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { EsServiceInternalToken } from '../../services/es_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { resolveRuleEventId } from '../build_alert_events';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { guardedMapStep } from '../stream_utils';
import type { PipelineStateStream, RuleExecutionStep } from '../types';

const IDS_QUERY_CHUNK_SIZE = 10_000;

/**
 * Drops breached events whose deterministic `_id` already exists in
 * `.rule-events`, so the director and downstream metrics only see rows that
 * will actually be persisted. Documents written earlier in the same run are
 * not yet searchable; those collide on `_id` at write time instead.
 */
@injectable()
export class FilterDuplicateEventsStep implements RuleExecutionStep {
  public readonly name = 'filter_duplicate_events';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['rule', 'alertEventsBatch'], async (state) => {
      const { rule, alertEventsBatch } = state;

      const candidateIds = new Map<AlertEvent, string>();
      for (const event of alertEventsBatch) {
        const id = resolveRuleEventId(event);
        if (id != null) candidateIds.set(event, id);
      }

      if (candidateIds.size === 0) {
        return { type: 'continue', state };
      }

      const existingIds = await this.fetchExistingIds([...candidateIds.values()]);

      if (existingIds.size === 0) {
        return { type: 'continue', state };
      }

      const filteredBatch = alertEventsBatch.filter((event) => {
        const id = candidateIds.get(event);
        return id == null || !existingIds.has(id);
      });

      const removedCount = alertEventsBatch.length - filteredBatch.length;
      this.logger.debug({
        message: `[${this.name}] Dropped ${removedCount} duplicate rule event(s) for rule ${rule.id}`,
      });

      return {
        type: 'continue',
        state: { ...state, alertEventsBatch: filteredBatch },
        meta: {
          counters: { [RULE_EXECUTION_COUNTERS.ruleEventsDeduplicated]: removedCount },
        },
      };
    });
  }

  private async fetchExistingIds(ids: string[]): Promise<Set<string>> {
    const existingIds = new Set<string>();

    for (let offset = 0; offset < ids.length; offset += IDS_QUERY_CHUNK_SIZE) {
      const chunk = ids.slice(offset, offset + IDS_QUERY_CHUNK_SIZE);
      try {
        const response = await this.esClient.search({
          index: ALERT_EVENTS_DATA_STREAM,
          query: { ids: { values: chunk } },
          _source: false,
          size: chunk.length,
        });

        for (const hit of response.hits.hits) {
          if (hit._id) {
            existingIds.add(hit._id);
          }
        }
      } catch (error) {
        this.logger.warn({
          code: ALERTING_LOG_CODES.RULE_EXECUTION_DEDUP_PRECHECK_FAILED,
          message: `[${this.name}] ids pre-check failed (chunk offset=${offset}). Relying on _id collision at write time for this chunk.`,
          error,
        });
      }
    }

    return existingIds;
  }
}
