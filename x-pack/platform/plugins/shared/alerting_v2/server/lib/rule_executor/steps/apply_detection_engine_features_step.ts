/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import type { AlertEvent } from '../../../resources/datastreams/alert_events';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { guardedMapStep } from '../stream_utils';

/**
 * Applies Security Solution detection engine features to a batch of alert events
 * after they have been created by CreateAlertEventsStep.
 *
 * This step is a scaffolding layer for porting DE v1 capabilities into the
 * Alerting v2 (RNA) pipeline. Each private method below corresponds to a
 * distinct feature area tracked in:
 * https://github.com/elastic/security-team/issues/17024
 *
 * Each feature area is a pass-through stub — implement them individually and
 * branch off this step for isolated feature work.
 *
 * Execution order within this step:
 *   1. Exception list filtering  (reduces the batch)
 *   2. Value list filtering       (reduces the batch)
 *   3. Enrichment                 (annotates events, does not reduce)
 *   4. Alert suppression          (may reduce or merge events)
 */
@injectable()
export class ApplyDetectionEngineFeaturesStep implements RuleExecutionStep {
  public readonly name = 'apply_detection_engine_features';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedMapStep(streamState, ['rule', 'alertEventsBatch'], async (state) => {
      const { input, alertEventsBatch } = state;

      step.logger.debug({
        message: `[${step.name}] Processing ${alertEventsBatch.length} alert event(s) for rule ${input.ruleId}`,
      });

      let batch: AlertEvent[] = [...alertEventsBatch];

      batch = await step.filterByExceptions(batch);
      batch = await step.filterByValueLists(batch);
      batch = await step.applyEnrichment(batch);
      batch = await step.applyAlertSuppression(batch);

      step.logger.debug({
        message: `[${step.name}] ${batch.length} alert event(s) remain after detection engine feature processing for rule ${input.ruleId}`,
      });

      return { type: 'continue', state: { ...state, alertEventsBatch: batch } };
    });
  }

  /**
   * TODO: Filter alert events against Security Solution exception lists.
   *
   * DE v1 reference: packages/kbn-securitysolution-list-utils
   * Key concepts to port:
   *   - Fetch the rule's exception list references from rule.exceptions_list
   *   - Resolve list items via the Kibana exceptions list client
   *   - Evaluate each alert event's source fields against the exception entries
   *   - Drop events that match any exception entry (unless the entry is "include")
   *
   * Suggested injection: ExceptionListClient (via ListPluginToken or similar)
   */
  private async filterByExceptions(batch: AlertEvent[]): Promise<AlertEvent[]> {
    return batch;
  }

  /**
   * TODO: Filter alert events against Kibana value lists.
   *
   * DE v1 reference: x-pack/solutions/security/plugins/security_solution/server/lists
   * Key concepts to port:
   *   - Resolve `list` exception entries that reference a value list by id
   *   - Stream-check alert field values against the list contents via the
   *     Lists plugin's `getListClient` / `findListItem` APIs
   *   - Drop events whose field values appear in a "match" list, or keep
   *     events whose field values appear in a "match_include" list
   *
   * Suggested injection: ListsPluginToken (lists plugin start contract)
   */
  private async filterByValueLists(batch: AlertEvent[]): Promise<AlertEvent[]> {
    return batch;
  }

  /**
   * TODO: Enrich alert events with host, user, and risk score metadata.
   *
   * DE v1 reference:
   *   x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/utils/enrichments/
   * Key concepts to port:
   *   - Host enrichment: resolve host.name → host risk score, host asset criticality
   *   - User enrichment: resolve user.name → user risk score, user asset criticality
   *   - Related integrations / threat-match enrichments if applicable
   *   - Merge enriched fields into each AlertEvent's source without overwriting
   *     fields already set by the ES|QL query
   *
   * Suggested injection: ElasticsearchServiceToken (scoped ES client)
   */
  private async applyEnrichment(batch: AlertEvent[]): Promise<AlertEvent[]> {
    return batch;
  }

  /**
   * TODO: Apply Security Solution alert suppression semantics.
   *
   * DE v1 reference:
   *   x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/utils/suppression/
   * Key concepts to port:
   *   - Read suppression config from rule.alert_suppression (group-by fields,
   *     duration window, missing-field handling)
   *   - Group the current batch by the suppression key (hash of group-by field values)
   *   - For each group: check whether an open suppressed alert already exists in
   *     the alerts index; if so, increment its suppression count and discard the
   *     duplicate; otherwise keep the representative event
   *   - Handle "suppress until end of rule execution" vs "suppress for duration" modes
   *
   * Note: RNA already has directional suppression support (#3 in issue 17024).
   * Coordinate with the RNA team before implementing to avoid divergence.
   *
   * Suggested injection: ElasticsearchServiceToken (scoped ES client)
   */
  private async applyAlertSuppression(batch: AlertEvent[]): Promise<AlertEvent[]> {
    return batch;
  }
}
