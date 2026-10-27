/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { getErrorMessage } from '../../../../../../common';
import type { MaintainerTelemetryClient } from '../../../../../tasks/entity_maintainers/maintainer_telemetry_client';
import type { ResolutionClient } from '../../../resolution_client';
import {
  CUSTOM_RULE_STATE_KEY_PREFIX,
  compareByCreation,
  customRuleStateKey,
  fingerprintDefinition,
  toExpressionMatchSpec,
  type CustomResolutionRule,
} from '../../custom';
import { runEsqlMatcherRule } from '../../matcher';
import type { ResolutionRulesClient } from '../../rule_client';
import type { EsqlExpressionMatchSpec } from '../../rule_registry';
import { EMPTY_RULE_STATE, type CustomRuleState, type PerRuleState } from './types';

/**
 * How long before the task timeout custom rules stop (the soft deadline); a run
 * Task Manager cancels at the timeout saves no rule's state, OOTB included.
 */
export const CUSTOM_RULES_DEADLINE_MARGIN_MS = 60 * 1000;

const CUSTOM_RULE_TELEMETRY_ID = 'custom';

const MAX_LAST_ERROR_LENGTH = 500;

export interface RunCustomRulesDeps {
  /** Mutated in place: custom-rule entries are written and pruned. */
  ruleStates: Record<string, PerRuleState>;
  resolutionRulesClient: ResolutionRulesClient;
  index: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  resolutionClient: ResolutionClient;
  signal: AbortSignal;
  telemetry: MaintainerTelemetryClient;
  mutatedIds: Set<string>;
  /** Epoch ms of the soft deadline: no custom rule starts after it and a running one stops between groups. */
  deadline: number;
}

const asCustomState = (state: PerRuleState | undefined): Partial<CustomRuleState> =>
  (state ?? {}) as Partial<CustomRuleState>;

// State written by another Kibana version may hold anything.
const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Deferred rules go first, the one that least recently went first leading; the rest follow oldest first. */
const orderForRun = (
  customRules: CustomResolutionRule[],
  ruleStates: Readonly<Record<string, PerRuleState>>
): CustomResolutionRule[] => {
  const stateOf = (rule: CustomResolutionRule) =>
    asCustomState(ruleStates[customRuleStateKey(rule.id)]);
  const deferred = customRules.filter((rule) => stateOf(rule).deferredByDeadline === true);
  const rest = customRules.filter((rule) => stateOf(rule).deferredByDeadline !== true);
  return [
    ...deferred.sort(
      (a, b) =>
        asText(stateOf(a).lastStartedFirstAt).localeCompare(
          asText(stateOf(b).lastStartedFirstAt)
        ) || compareByCreation(a, b)
    ),
    ...rest.sort(compareByCreation),
  ];
};

const truncate = (message: string): string =>
  message.length > MAX_LAST_ERROR_LENGTH ? `${message.slice(0, MAX_LAST_ERROR_LENGTH)}…` : message;

const markDeferred = (
  ruleStates: Record<string, PerRuleState>,
  notStarted: CustomResolutionRule[]
): void => {
  for (const { id } of notStarted) {
    const stateKey = customRuleStateKey(id);
    ruleStates[stateKey] = {
      ...EMPTY_RULE_STATE,
      ...ruleStates[stateKey],
      deferredByDeadline: true,
    };
  }
};

const recordFailure = (
  ruleStates: Record<string, PerRuleState>,
  stateKey: string,
  error: unknown
): void => {
  ruleStates[stateKey] = {
    ...EMPTY_RULE_STATE,
    ...ruleStates[stateKey],
    lastError: truncate(getErrorMessage(error)),
  };
};

const priorStateIfDefinitionUnchanged = (
  previous: PerRuleState | undefined,
  definitionFingerprint: string
): PerRuleState => {
  if (!previous || asCustomState(previous).definitionFingerprint !== definitionFingerprint) {
    return EMPTY_RULE_STATE;
  }
  return { lastProcessedTimestamp: previous.lastProcessedTimestamp, lastRun: previous.lastRun };
};

// A rule missing from the list is only pruned once a read by id confirms it's
// gone, so a run that can't see the rules never wipes their saved progress.
const pruneDeletedRules = async (
  { ruleStates, resolutionRulesClient, logger }: RunCustomRulesDeps,
  customRules: CustomResolutionRule[]
): Promise<void> => {
  const live = new Set(customRules.map(({ id }) => customRuleStateKey(id)));
  const missing = Object.keys(ruleStates).filter(
    (key) => key.startsWith(CUSTOM_RULE_STATE_KEY_PREFIX) && !live.has(key)
  );
  for (const stateKey of missing) {
    const id = stateKey.slice(CUSTOM_RULE_STATE_KEY_PREFIX.length);
    try {
      if ((await resolutionRulesClient.getCustomRule(id)) === undefined) {
        delete ruleStates[stateKey];
      }
    } catch (error) {
      logger.warn(
        `${stateKey}: keeping its state; the maintainer's API key owner can't read the rule (${getErrorMessage(
          error
        )})`
      );
    }
  }
};

/**
 * Applies saved custom rules after the OOTB rules. Each rule is isolated: an
 * invalid or failing rule is logged, recorded as `lastError` in its state, and
 * skipped.
 */
export async function runCustomResolutionRules(deps: RunCustomRulesDeps): Promise<void> {
  const { resolutionRulesClient, logger, signal } = deps;

  let customRules: CustomResolutionRule[];
  try {
    customRules = await resolutionRulesClient.getCustomRules();
  } catch (error) {
    logger.warn(
      `Skipping custom resolution rules this run; failed to load them: ${getErrorMessage(error)}`
    );
    return;
  }

  await pruneDeletedRules(deps, customRules);

  const remainingMs = deps.deadline - Date.now();
  if (remainingMs <= 0) {
    logger.info('Skipping custom resolution rules this run; the soft deadline has passed');
    return;
  }

  const deadlineController = new AbortController();
  const timer = setTimeout(() => deadlineController.abort(), remainingMs);
  const onTaskAbort = () => deadlineController.abort();
  signal.addEventListener('abort', onTaskAbort);
  if (signal.aborted) {
    deadlineController.abort();
  }
  try {
    await runEnabledRulesUntilAborted(deps, customRules, deadlineController.signal);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onTaskAbort);
  }
}

async function runEnabledRulesUntilAborted(
  deps: RunCustomRulesDeps,
  customRules: CustomResolutionRule[],
  deadlineOrAbortSignal: AbortSignal
): Promise<void> {
  const { ruleStates, resolutionRulesClient, index, esClient, logger, signal } = deps;
  const reachedDeadline = () => deadlineOrAbortSignal.aborted && !signal.aborted;
  const enabledRules = orderForRun(
    customRules.filter(({ enabled }) => enabled),
    ruleStates
  );
  if (enabledRules.length > 0) {
    logger.info(
      `Custom resolution rules this run, in order: ${enabledRules
        .map(({ id }) => customRuleStateKey(id))
        .join(', ')}`
    );
  }

  let anyRuleStartedThisRun = false;
  for (const [position, listedRule] of enabledRules.entries()) {
    const stateKey = customRuleStateKey(listedRule.id);
    if (deadlineOrAbortSignal.aborted) {
      const notStarted = enabledRules.slice(position);
      if (reachedDeadline()) {
        markDeferred(ruleStates, notStarted);
        logger.info(
          `Custom resolution rules reached the soft deadline; ${notStarted.length} rule(s) continue next run`
        );
      } else {
        logger.debug(`Aborted automated-resolution before ${stateKey}`);
      }
      return;
    }

    // Re-read right before running: a disable, delete or edit since the list
    // was loaded must take effect now, not after the deadline.
    let currentRule: CustomResolutionRule | undefined;
    try {
      currentRule = await resolutionRulesClient.getCustomRule(listedRule.id);
    } catch (error) {
      logger.warn(`${stateKey} failed: ${getErrorMessage(error)}`);
      recordFailure(ruleStates, stateKey, error);
      continue;
    }
    if (!currentRule?.enabled) {
      logger.debug(`Skipping ${stateKey}: disabled or deleted since load`);
      continue;
    }

    let spec: EsqlExpressionMatchSpec;
    try {
      spec = toExpressionMatchSpec(currentRule);
    } catch (error) {
      logger.warn(`${stateKey} failed: ${getErrorMessage(error)}`);
      recordFailure(ruleStates, stateKey, error);
      continue;
    }
    const definitionFingerprint = fingerprintDefinition(currentRule);

    const ruleState = priorStateIfDefinitionUnchanged(ruleStates[stateKey], definitionFingerprint);
    const lastAttemptAt = new Date().toISOString();
    const lastStartedFirstAt = anyRuleStartedThisRun
      ? (asCustomState(ruleStates[stateKey]).lastStartedFirstAt ?? null)
      : lastAttemptAt;
    anyRuleStartedThisRun = true;
    let matcherResultState: PerRuleState = ruleState;
    let matcherFinished = false;
    let lastError: string | null = null;
    try {
      matcherResultState = await runEsqlMatcherRule({
        state: ruleState,
        esClient,
        logger,
        resolutionClient: deps.resolutionClient,
        signal: deadlineOrAbortSignal,
        telemetry: deps.telemetry,
        spec,
        ruleId: stateKey,
        telemetryRuleId: CUSTOM_RULE_TELEMETRY_ID,
        mutatedIds: deps.mutatedIds,
        index,
      });
      // The matcher returns, rather than throws, when it is aborted mid-scan.
      matcherFinished = !deadlineOrAbortSignal.aborted;
      await esClient.indices.refresh({ index });
    } catch (error) {
      if (!reachedDeadline()) {
        logger.warn(`${stateKey} failed: ${getErrorMessage(error)}`);
        lastError = truncate(getErrorMessage(error));
      }
    }

    // A deadline that fires during the final refresh doesn't defer a rule that finished.
    const deferredByDeadline = !matcherFinished && reachedDeadline();
    if (deferredByDeadline) {
      logger.info(`${stateKey}: stopped at the soft deadline; continues next run`);
    }

    // Written even on failure or early stop so the next run's order sees it.
    const nextState: CustomRuleState = {
      ...matcherResultState,
      definitionFingerprint,
      lastAttemptAt,
      lastStartedFirstAt,
      deferredByDeadline,
      lastError,
    };
    ruleStates[stateKey] = nextState;
  }
}
