/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { DEFAULT_GROUPING_MODE } from '../constants';
import {
  DispatchOutcome,
  DispatchPlan,
  EpisodeScan,
  EpisodeTriage,
  PolicyCatalog,
  RuleCatalog,
  SuppressionIndex,
  type SuppressedEpisode,
} from '../state';
import { DISPATCH_FAILURE_REASONS } from '../steps/constants';
import type {
  ActionGroup,
  ActionGroupId,
  ActionPolicy,
  ActionPolicyId,
  AlertEpisode,
  AlertEpisodeSuppression,
  DispatchFailure,
  DispatcherPipelineInput,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
  Rule,
  RuleId,
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

/**
 * Flat overrides for building a pipeline state: value-object fields are given
 * through their raw source data (`episodes`, `rules`, `policies`) and folded
 * into the value objects here.
 */
export interface DispatcherPipelineStateOverrides
  extends Omit<
    Partial<DispatcherPipelineState>,
    'input' | 'scan' | 'rules' | 'policies' | 'suppressions' | 'triage' | 'plan' | 'outcome'
  > {
  input?: DispatcherPipelineInput;
  episodes?: AlertEpisode[];
  suppressions?: AlertEpisodeSuppression[];
  dispatchable?: AlertEpisode[];
  suppressed?: SuppressedEpisode[];
  rules?: Map<RuleId, Rule>;
  policies?: Map<ActionPolicyId, ActionPolicy>;
  dispatch?: ActionGroup[];
  throttled?: ActionGroup[];
  dispatchedExecutions?: Map<ActionGroupId, string[]>;
  dispatchFailures?: DispatchFailure[];
}

export function createDispatcherPipelineState(
  state: DispatcherPipelineStateOverrides = {}
): DispatcherPipelineState {
  const {
    episodes,
    suppressions,
    dispatchable,
    suppressed,
    rules,
    policies,
    dispatch,
    throttled,
    dispatchedExecutions,
    dispatchFailures,
    input,
    ...rest
  } = state;
  return {
    ...rest,
    ...(episodes ? { scan: EpisodeScan.of({ episodes }) } : {}),
    ...(suppressions ? { suppressions: SuppressionIndex.of(suppressions) } : {}),
    ...(dispatchable || suppressed
      ? {
          triage: EpisodeTriage.of({
            dispatchable: dispatchable ?? [],
            suppressed: suppressed ?? [],
          }),
        }
      : {}),
    ...(rules ? { rules: RuleCatalog.of(rules) } : {}),
    ...(policies ? { policies: PolicyCatalog.of(policies) } : {}),
    ...(dispatch || throttled || dispatchable
      ? {
          plan: DispatchPlan.of({
            toDispatch: dispatch ?? [],
            throttled: throttled ?? [],
            dispatchable: dispatchable ?? [],
          }),
        }
      : {}),
    ...(dispatchedExecutions || dispatchFailures
      ? {
          outcome: DispatchOutcome.of({
            executionsByGroup: dispatchedExecutions ?? new Map(),
            failures: dispatchFailures ?? [],
          }),
        }
      : {}),
    input: input ?? createDispatcherPipelineInput(),
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
    groupingMode: DEFAULT_GROUPING_MODE,
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
