/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { DISPATCH_FAILURE_REASONS } from '../steps/constants';
import type {
  ActionGroup,
  ActionPolicy,
  AlertEpisode,
  AlertEpisodeSuppression,
  DispatchFailure,
  DispatcherPipelineInput,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
  Rule,
} from '../types';

export function createStepLogger(): LoggerServiceContract {
  return createLoggerService().loggerService;
}

export function createDispatcherPipelineInput(
  overrides: Partial<DispatcherPipelineInput> = {}
): DispatcherPipelineInput {
  // Default window: eventWatermark=07:30, windowStart=07:20 (−10min overlap),
  // windowEnd=07:35 (windowStart+15min), consistent with OVERLAP/MAX constants.
  return {
    startedAt: new Date('2026-01-22T08:00:00.000Z'),
    eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
    windowStart: new Date('2026-01-22T07:20:00.000Z'),
    windowEnd: new Date('2026-01-22T07:35:00.000Z'),
    executionUuid: '00000000-0000-4000-8000-000000000000',
    signal: new AbortController().signal,
    ...overrides,
  };
}

export function createDispatcherPipelineState(
  state: Partial<DispatcherPipelineState> = {}
): DispatcherPipelineState {
  const input = state.input ?? createDispatcherPipelineInput();
  return {
    ...state,
    input,
  };
}

export function createAlertEpisode(overrides: Partial<AlertEpisode> = {}): AlertEpisode {
  return {
    last_event_timestamp: '2026-01-22T07:10:00.000Z',
    rule_id: 'rule-1',
    source: 'internal',
    space_id: 'default',
    group_hash: 'hash-1',
    episode_id: 'episode-1',
    episode_status: 'active',
    ...overrides,
  };
}

export function createAlertEpisodeSuppression(
  overrides: Partial<AlertEpisodeSuppression> = {}
): AlertEpisodeSuppression {
  return {
    rule_id: 'rule-1',
    source: 'internal',
    space_id: 'default',
    group_hash: 'hash-1',
    episode_id: 'episode-1',
    should_suppress: false,
    ...overrides,
  };
}

export function createRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1',
    spaceId: 'default',
    name: 'Test rule',
    tags: [],
    ...overrides,
  };
}

export function createActionPolicy(overrides: Partial<ActionPolicy> = {}): ActionPolicy {
  return {
    id: 'policy-1',
    spaceId: 'default',
    name: 'Test policy',
    enabled: true,
    destinations: [{ type: 'workflow' as const, id: 'workflow-1' }],
    groupBy: [],
    tags: [],
    ...overrides,
  };
}

export function createRuleScopedActionPolicy(
  ruleId: string,
  overrides: Partial<ActionPolicy> = {}
): ActionPolicy {
  return createActionPolicy({
    name: 'Test rule-scoped policy',
    matcher: `rule.id: "${ruleId}"`,
    ...overrides,
  });
}

export function createMatchedPair(overrides: Partial<MatchedPair> = {}): MatchedPair {
  return {
    episode: createAlertEpisode(),
    policy: createActionPolicy(),
    ...overrides,
  };
}

export function createActionGroup(overrides: Partial<ActionGroup> = {}): ActionGroup {
  return {
    id: 'group-1',
    spaceId: 'default',
    policyId: 'policy-1',
    destinations: [{ type: 'workflow' as const, id: 'workflow-1' }],
    groupKey: {},
    episodes: [createAlertEpisode()],
    rules: {},
    ...overrides,
  };
}

export function createDispatchFailure(overrides: Partial<DispatchFailure> = {}): DispatchFailure {
  return {
    policyId: 'policy-1',
    spaceId: 'default',
    actionGroupId: 'group-1',
    workflowId: 'workflow-1',
    episodes: [createAlertEpisode()],
    reason: DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
    message: 'Dispatch failed',
    ...overrides,
  };
}

export function createMockDispatcherStep(
  name: string,
  executeFn: (
    state: Readonly<DispatcherPipelineState>,
    logger: LoggerServiceContract
  ) => Promise<DispatcherStepOutput>
): DispatcherStep {
  return {
    name,
    execute: jest.fn((state, logger) => executeFn(state, logger)),
  };
}
