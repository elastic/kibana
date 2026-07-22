/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reproduces the per-batch false-recovery bug in the rule executor.
 * https://github.com/elastic/rna-program/issues/760
 *
 * `CreateRecoveryEventsStep` runs once per streaming batch and computes
 * recoveries against only the current batch's breached group hashes
 * (`create_recovery_events_step.ts` line 83). When a group's rows arrive in a
 * later batch of the same execution, the step sees it as "active but not
 * breached in this batch" and emits a spurious `recovered` event — followed by
 * the real `breached` event once its batch is processed.
 *
 * This test drives the two real steps that build alert events and recovery
 * events (`CreateAlertEventsStep` -> `CreateRecoveryEventsStep`) over two
 * batches, exactly as `ExecuteRuleQueryStep` fans them out in production, and
 * asserts the desired behavior: a group that breaches anywhere in the
 * execution must not be recovered. It currently fails, demonstrating the bug.
 */

import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createQueryService } from '../services/query_service/query_service.mock';
import { buildGroupHash } from './build_alert_events';
import { CreateAlertEventsStep } from './steps/create_alert_events_step';
import { CreateRecoveryEventsStep } from './steps/create_recovery_events_step';
import {
  collectStreamResults,
  createEsqlResponse,
  createRuleExecutionInput,
  createRuleResponse,
} from './test_utils';
import type { PipelineStateStream, RulePipelineState } from './types';
import type { AlertEvent } from '../../resources/datastreams/alert_events';

const GROUPING_FIELDS = ['host.name'];

const groupHashFor = (host: string): string =>
  buildGroupHash({
    rowDoc: { 'host.name': host },
    groupKeyFields: GROUPING_FIELDS,
    fallbackSeed: '',
  });

const createActiveGroupHashesResponse = (groupHashes: string[]) =>
  createEsqlResponse(
    [{ name: 'group_hash', type: 'keyword' }],
    groupHashes.map((h) => [h])
  );

const rowsStream = (batches: Array<Array<Record<string, unknown>>>): PipelineStateStream => {
  const input = createRuleExecutionInput();
  const rule = createRuleResponse({
    kind: 'alert',
    recovery_strategy: 'no_breach',
    grouping: { fields: GROUPING_FIELDS },
  });

  return (async function* () {
    for (const batch of batches) {
      const state: RulePipelineState = { input, rule, esqlRowBatch: batch };
      yield { type: 'continue', state };
    }
  })();
};

describe('rule executor: per-batch false recovery (issue: executor false recovery)', () => {
  const { loggerService } = createLoggerService();

  it('does not recover a group that breaches in a later batch of the same execution', async () => {
    const hostA = groupHashFor('host-a');

    const internal = createQueryService();
    const scoped = createQueryService();

    // host-a is a currently-active series (it was breaching in prior executions).
    internal.mockEsClient.esql.query.mockResolvedValue(
      createActiveGroupHashesResponse([hostA])
    );

    const createAlertEventsStep = new CreateAlertEventsStep(loggerService);
    const createRecoveryEventsStep = new CreateRecoveryEventsStep(
      loggerService,
      internal.queryService,
      scoped.queryService
    );

    // This execution's ES|QL results stream in two batches. host-a's rows land
    // in batch 2 — but host-a IS breaching this execution.
    const batches = [
      [{ 'host.name': 'host-b' }, { 'host.name': 'host-c' }], // batch 1
      [{ 'host.name': 'host-a' }], // batch 2
    ];

    const afterAlertEvents = createAlertEventsStep.executeStream(rowsStream(batches));
    const afterRecovery = createRecoveryEventsStep.executeStream(afterAlertEvents);
    const results = await collectStreamResults(afterRecovery);

    const emittedEvents: AlertEvent[] = results.flatMap((r) =>
      r.type === 'continue' ? [...(r.state.alertEventsBatch ?? [])] : []
    );

    const hostABreached = emittedEvents.filter(
      (e) => e.group_hash === hostA && e.status === 'breached'
    );
    const hostARecovered = emittedEvents.filter(
      (e) => e.group_hash === hostA && e.status === 'recovered'
    );

    // host-a breached this execution, so it should be reported breached...
    expect(hostABreached).toHaveLength(1);
    // ...and never recovered. Today a spurious recovered event is emitted for
    // batch 1, so this assertion fails until the recovery decision is deferred
    // to end-of-stream.
    expect(hostARecovered).toHaveLength(0);
  });
});
