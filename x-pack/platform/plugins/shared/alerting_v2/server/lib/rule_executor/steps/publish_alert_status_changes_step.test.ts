/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertStatusTransition } from '../../director/director';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createMockAlertStatusChangedEventPublisher } from '../../events/alert_status_changed_event_publisher/alert_status_changed_event_publisher.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import type { RulePipelineState } from '../types';
import {
  collectStreamResults,
  createAlertEvent,
  createPipelineStream,
  createRulePipelineState,
  createRuleResponse,
} from '../test_utils';
import { PublishAlertStatusChangesStep } from './publish_alert_status_changes_step';

const rule = createRuleResponse({
  id: 'rule-1',
  kind: 'alert',
  metadata: { name: 'CPU above 90%', tags: ['k8s'] },
});

const transition = (overrides: Partial<AlertStatusTransition> = {}): AlertStatusTransition => ({
  groupHash: 'hash-1',
  episodeId: 'episode-1',
  previousStatus: 'pending',
  status: 'active',
  ...overrides,
});

const storedEvent = ({ episodeId, status, groupHash }: AlertStatusTransition) =>
  createAlertEvent({ group_hash: groupHash, type: 'alert', alert: { id: episodeId, status } });

const batchState = (
  transitions: AlertStatusTransition[],
  stored: AlertStatusTransition[] = transitions,
  overrides: Partial<RulePipelineState> = {}
): RulePipelineState =>
  createRulePipelineState({
    rule,
    alertStatusTransitions: transitions,
    storedAlertEvents: stored.map(storedEvent),
    ...overrides,
  });

describe('PublishAlertStatusChangesStep', () => {
  let publisher: ReturnType<typeof createMockAlertStatusChangedEventPublisher>;
  let step: PublishAlertStatusChangesStep;

  beforeEach(() => {
    publisher = createMockAlertStatusChangedEventPublisher();
    step = new PublishAlertStatusChangesStep(publisher);
  });

  it('publishes the stored transitions of a batch with the rule and execution', async () => {
    const state = batchState([transition()]);

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'continue', state });
    expect(publisher.publishAlertStatusChanges).toHaveBeenCalledTimes(1);
    expect(publisher.publishAlertStatusChanges).toHaveBeenCalledWith([
      {
        spaceId: 'default',
        source: 'internal',
        alert: {
          id: 'episode-1',
          groupHash: 'hash-1',
          status: 'active',
          previousStatus: 'pending',
        },
        rule: { id: 'rule-1', name: 'CPU above 90%', tags: ['k8s'] },
        execution: { executionId: 'execution-1', scheduledAt: '2025-01-01T00:00:00.000Z' },
      },
    ]);
  });

  it('only publishes transitions whose alert event was stored', async () => {
    const stored = transition({ episodeId: 'episode-stored', groupHash: 'hash-stored' });
    const rejected = transition({ episodeId: 'episode-rejected', groupHash: 'hash-rejected' });

    await collectStreamResults(
      step.executeStream(createPipelineStream([batchState([stored, rejected], [stored])]))
    );

    expect(publisher.publishAlertStatusChanges).toHaveBeenCalledWith([
      expect.objectContaining({ alert: expect.objectContaining({ id: 'episode-stored' }) }),
    ]);
  });

  it('does not match a stored event of the same alert with a different status', async () => {
    const changed = transition({ status: 'active' });

    await collectStreamResults(
      step.executeStream(
        createPipelineStream([batchState([changed], [transition({ status: 'pending' })])])
      )
    );

    expect(publisher.publishAlertStatusChanges).not.toHaveBeenCalled();
  });

  it('publishes a change once when a later batch of the same run computes it again', async () => {
    const first = transition();
    const second = transition({ episodeId: 'episode-2', groupHash: 'hash-2' });

    await collectStreamResults(
      step.executeStream(createPipelineStream([batchState([first]), batchState([first, second])]))
    );

    expect(publisher.publishAlertStatusChanges).toHaveBeenCalledTimes(2);
    expect(publisher.publishAlertStatusChanges).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({ alert: expect.objectContaining({ id: 'episode-1' }) }),
    ]);
    expect(publisher.publishAlertStatusChanges).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({ alert: expect.objectContaining({ id: 'episode-2' }) }),
    ]);
  });

  it('publishes the same change again in a separate run', async () => {
    await collectStreamResults(
      step.executeStream(createPipelineStream([batchState([transition()])]))
    );
    await collectStreamResults(
      step.executeStream(createPipelineStream([batchState([transition()])]))
    );

    expect(publisher.publishAlertStatusChanges).toHaveBeenCalledTimes(2);
  });

  it('passes batches without transitions through without publishing', async () => {
    const signalState = createRulePipelineState({
      rule: createRuleResponse({ kind: 'signal' }),
      alertEventsBatch: [createAlertEvent()],
      storedAlertEvents: [createAlertEvent()],
    });
    const emptyState = batchState([]);

    const results = await collectStreamResults(
      step.executeStream(createPipelineStream([signalState, emptyState]))
    );

    expect(results).toEqual([
      { type: 'continue', state: signalState },
      { type: 'continue', state: emptyState },
    ]);
    expect(publisher.publishAlertStatusChanges).not.toHaveBeenCalled();
  });

  it('logs a publish failure and continues the run', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    publisher.publishAlertStatusChanges.mockRejectedValueOnce(new Error('bus unavailable'));
    const state = batchState([transition()], undefined, {
      logger: loggerService.forSubsystem('ruleExecutor'),
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'continue', state });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to publish alert status changes',
      expect.objectContaining({
        labels: expect.objectContaining({
          code: ALERTING_LOG_CODES.RULE_EXECUTION_ALERT_STATUS_CHANGES_PUBLISH_FAILED,
        }),
      })
    );
  });
});
