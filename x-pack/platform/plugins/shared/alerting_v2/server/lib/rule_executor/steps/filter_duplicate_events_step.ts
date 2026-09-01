/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/datastreams/alert_events';
import type { AlertEvent } from '../../../resources/datastreams/alert_events';
import { EsServiceInternalToken } from '../../services/es_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { guardedMapStep } from '../stream_utils';
import type { PipelineStateStream, RuleExecutionStep } from '../types';

const IDS_QUERY_CHUNK_SIZE = 10_000;

@injectable()
export class FilterDuplicateEventsStep implements RuleExecutionStep {
  public readonly name = 'filter_duplicate_events';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['alertEventsBatch'], async (state) => {
      const { deduplicationIds, alertEventsBatch } = state;

      if (!deduplicationIds || deduplicationIds.size === 0) {
        return { type: 'continue', state };
      }

      const candidateEvents = alertEventsBatch.filter((e) => deduplicationIds.has(e));
      if (candidateEvents.length === 0) {
        return { type: 'continue', state };
      }

      const allIds = candidateEvents.map((e) => deduplicationIds.get(e)!);
      const existingIds = await this.fetchExistingIds(allIds);

      if (existingIds.size === 0) {
        return { type: 'continue', state };
      }

      const filteredBatch = alertEventsBatch.filter((e) => {
        const id = deduplicationIds.get(e as AlertEvent);
        return id == null || !existingIds.has(id);
      });

      const removedCount = alertEventsBatch.length - filteredBatch.length;
      this.logger.debug({
        message: `[${this.name}] Pre-filtered ${removedCount} duplicate event(s) for rule ${state.rule?.id}`,
      });

      const filteredDeduplicationIds = new Map<AlertEvent, string>();
      for (const event of filteredBatch) {
        const id = deduplicationIds.get(event as AlertEvent);
        if (id != null) {
          filteredDeduplicationIds.set(event as AlertEvent, id);
        }
      }

      return {
        type: 'continue',
        state: {
          ...state,
          alertEventsBatch: filteredBatch,
          deduplicationIds: filteredDeduplicationIds,
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
      } catch (err) {
        this.logger.warn({
          message: `[${this.name}] ids pre-check failed (chunk offset=${offset}): ${
            err instanceof Error ? err.message : String(err)
          }. Skipping pre-filter for this chunk.`,
        });
      }
    }

    return existingIds;
  }
}
