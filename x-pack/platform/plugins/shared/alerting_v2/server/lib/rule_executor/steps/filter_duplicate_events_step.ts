/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { chunk } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertEvent } from '../../../resources/datastreams/alert_events';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { EsServiceInternalToken } from '../../services/es_service/tokens';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { resolveRuleEventId } from '../build_alert_events';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { guardedMapStep } from '../stream_utils';
import type { PipelineStateStream, RuleExecutionStep } from '../types';

/** Upper bound on the `ids` query, matching the detection engine's pre-check. */
const IDS_QUERY_CHUNK_SIZE = 10_000;

/**
 * First of the two rule-event deduplication layers.
 *
 * Drops breached events whose deterministic `_id` (see `resolveRuleEventId`)
 * already exists in `.rule-events`, so the director does not open or advance
 * episodes for rows that will never be persisted and the metrics only count
 * rows that will. Bound after `ClassifyAbsentGroupsStep`, which has already
 * recorded the group as breaching for the absence check, and before
 * `DirectorStep`.
 *
 * The pre-check can only see documents that are already searchable. Writes
 * use `refresh: false`, so a duplicate written earlier in the *same* run is
 * invisible here and is caught instead by the `_id` collision (409) in
 * `StoreAlertEventsStep`, the second layer. Both layers feed the
 * `ruleEventsDeduplicated` counter with disjoint counts.
 *
 * Failure of the Elasticsearch lookup is not fatal: the affected events are
 * kept and the second layer deduplicates them at write time.
 */
@injectable()
export class FilterDuplicateEventsStep implements RuleExecutionStep {
  public readonly name = 'filter_duplicate_events';

  constructor(@inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['alertEventsBatch'], async (state) => {
      const logger = state.logger.withLabels({ step: this.name });
      const candidateIds = resolveCandidateIds(state.alertEventsBatch);

      if (candidateIds.size === 0) {
        return { type: 'continue', state };
      }

      const existingIds = await this.fetchExistingIds([...candidateIds.values()], logger);
      const isDuplicate = (event: AlertEvent) => existingIds.has(candidateIds.get(event) ?? '');
      const alertEventsBatch = state.alertEventsBatch.filter((event) => !isDuplicate(event));
      const removedCount = state.alertEventsBatch.length - alertEventsBatch.length;

      if (removedCount === 0) {
        return { type: 'continue', state };
      }

      logger.debug({ message: `Dropped ${removedCount} duplicate rule event(s)` });

      return {
        type: 'continue',
        state: { ...state, alertEventsBatch },
        meta: { counters: { [RULE_EXECUTION_COUNTERS.ruleEventsDeduplicated]: removedCount } },
      };
    });
  }

  /**
   * Returns the subset of `ids` that already exist in `.rule-events`.
   *
   * Ids are looked up in parallel chunks of {@link IDS_QUERY_CHUNK_SIZE}. A
   * chunk whose lookup fails is logged with
   * `RULE_EXECUTION_DEDUP_PRECHECK_FAILED` and treated as "nothing exists",
   * so its events flow on to the director and the write; any true duplicates
   * among them are still rejected by the `_id` collision in
   * `StoreAlertEventsStep`. The trade-off is a possible episode advance for a
   * row that is then dropped, which is why the failure is logged at `warn`.
   */
  private async fetchExistingIds(
    ids: readonly string[],
    logger: LoggerServiceContract
  ): Promise<ReadonlySet<string>> {
    const found = await Promise.all(
      chunk(ids, IDS_QUERY_CHUNK_SIZE).map((values, index) =>
        this.searchExistingIds(values).catch((error: unknown) => {
          logger.warn({
            code: ALERTING_LOG_CODES.RULE_EXECUTION_DEDUP_PRECHECK_FAILED,
            message: `ids pre-check failed for chunk ${index}. Relying on _id collision at write time for its events.`,
            error,
          });
          return [];
        })
      )
    );

    return new Set(found.flat());
  }

  /**
   * Single `ids` query against `.rule-events` for one chunk. Fetches no
   * `_source`; only the matched `_id`s are needed. Propagates Elasticsearch
   * errors to {@link fetchExistingIds}, which decides how to degrade.
   */
  private async searchExistingIds(values: string[]): Promise<string[]> {
    const response = await this.esClient.search({
      index: ALERT_EVENTS_DATA_STREAM,
      query: { ids: { values } },
      _source: false,
      size: values.length,
    });

    return response.hits.hits.flatMap((hit) => (hit._id ? [hit._id] : []));
  }
}

/**
 * Maps each event that qualifies for deduplication to its deterministic
 * `_id`, keyed by object identity so the batch can be filtered without
 * recomputing hashes. Events `resolveRuleEventId` declines (aggregated rows,
 * recovered, no_data, continued-breach) are absent from the map and always
 * pass through the step untouched.
 */
const resolveCandidateIds = (events: readonly AlertEvent[]): ReadonlyMap<AlertEvent, string> =>
  new Map(
    events.flatMap((event) => {
      const id = resolveRuleEventId(event);
      return id ? [[event, id] as const] : [];
    })
  );
