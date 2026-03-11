/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertEpisode,
  AlertEpisodeSuppression,
  DispatcherPipelineInput,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
  NotificationGroup,
  NotificationPolicy,
  Rule,
} from '../types';

export function createDispatcherPipelineInput(
  overrides: Partial<DispatcherPipelineInput> = {}
): DispatcherPipelineInput {
  return {
    startedAt: new Date('2026-01-22T08:00:00.000Z'),
    previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
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
    name: 'Test rule',
    description: '',
    labels: [],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createNotificationPolicy(
  overrides: Partial<NotificationPolicy> = {}
): NotificationPolicy {
  return {
    id: 'policy-1',
    name: 'Test policy',
    enabled: true,
    destinations: [{ type: 'workflow' as const, id: 'workflow-1' }],
    groupBy: [],
    ruleLabels: [],
    ...overrides,
  };
}

export function createMatchedPair(overrides: Partial<MatchedPair> = {}): MatchedPair {
  return {
    episode: createAlertEpisode(),
    policy: createNotificationPolicy(),
    ...overrides,
  };
}

export function createNotificationGroup(
  overrides: Partial<NotificationGroup> = {}
): NotificationGroup {
  return {
    id: 'group-1',
    ruleId: 'rule-1',
    policyId: 'policy-1',
    destinations: [{ type: 'workflow' as const, id: 'workflow-1' }],
    groupKey: {},
    episodes: [createAlertEpisode()],
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
