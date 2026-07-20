/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionPolicy,
  AlertEpisode,
  AlertEpisodeSuppression,
  DispatcherPipelineInput,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
  ActionGroup,
  Rule,
} from '../types';

export function createDispatcherPipelineInput(
  overrides: Partial<DispatcherPipelineInput> = {}
): DispatcherPipelineInput {
  return {
    startedAt: new Date('2026-01-22T08:00:00.000Z'),
    previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
    executionUuid: '00000000-0000-4000-8000-000000000000',
    ...overrides,
  };
}

export function createDispatcherPipelineState(
  state?: Partial<DispatcherPipelineState>
): DispatcherPipelineState {
  return {
    input: createDispatcherPipelineInput(),
    ...state,
  };
}

export function createAlertEpisode(overrides: Partial<AlertEpisode> = {}): AlertEpisode {
  return {
    last_event_timestamp: '2026-01-22T07:10:00.000Z',
    rule_id: 'rule-1',
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

export function createMockDispatcherStep(
  name: string,
  executeFn: (state: Readonly<DispatcherPipelineState>) => Promise<DispatcherStepOutput>
): DispatcherStep {
  return {
    name,
    execute: jest.fn(executeFn),
  };
}
