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
  customRuleStateKey,
  fingerprintMatchSpec,
  toExpressionMatchSpec,
  toRuleDefinition,
  type CustomResolutionRule,
} from '../../custom';
import { runEsqlMatcherRule } from '../../matcher';
import type { ResolutionRulesClient } from '../../rule_client';
import type { EsqlExpressionMatchSpec } from '../../rule_registry';
import type { CustomRuleState, PerRuleState } from './types';

const EMPTY_RULE_STATE: PerRuleState = { lastProcessedTimestamp: null, lastRun: null };

export interface RunCustomRulesDeps {
  /** State read at the start of the run. */
  previousRules: Readonly<Record<string, PerRuleState>>;
  /** State this run returns; custom-rule entries are written and pruned here. */
  rules: Record<string, PerRuleState>;
  resolutionRulesClient: ResolutionRulesClient;
  namespace: string;
  index: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  resolutionClient: ResolutionClient;
  signal: AbortSignal;
  telemetry: MaintainerTelemetryClient;
  mutatedIds: Set<string>;
  /** Epoch ms after which no custom-rule work starts and running rules stop between groups. */
  deadline: number;
}

/**
 * Custom rules stop this long after the run starts, a minute before the
 * maintainer's 5m task timeout. A run that ends on its own saves every rule's
 * state; a run Task Manager cancels saves none, OOTB rules included.
 */
export const CUSTOM_RULES_SOFT_DEADLINE_MS = 4 * 60 * 1000;

const lastAttemptOf = (state: PerRuleState | undefined): string =>
  (state as Partial<CustomRuleState> | undefined)?.lastAttemptAt ?? '';

// Least recently started first, so one heavy rule that keeps reaching the
// deadline cannot starve the rules after it.
const byLeastRecentAttempt =
  (previousRules: Readonly<Record<string, PerRuleState>>) =>
  (a: CustomResolutionRule, b: CustomResolutionRule): number =>
    lastAttemptOf(previousRules[customRuleStateKey(a.id)]).localeCompare(
      lastAttemptOf(previousRules[customRuleStateKey(b.id)])
    );

const readPriorState = (
  previous: PerRuleState | undefined,
  definitionHash: string
): PerRuleState => {
  if (!previous || (previous as Partial<CustomRuleState>).definitionHash !== definitionHash) {
    return EMPTY_RULE_STATE;
  }
  return { lastProcessedTimestamp: previous.lastProcessedTimestamp, lastRun: previous.lastRun };
};

const compileRule = (
  rule: CustomResolutionRule,
  logger: Logger
): { spec: EsqlExpressionMatchSpec; definitionHash: string } | undefined => {
  try {
    const spec = toExpressionMatchSpec(toRuleDefinition(rule));
    return { spec, definitionHash: fingerprintMatchSpec(spec) };
  } catch (error) {
    logger.warn(`Custom resolution rule '${rule.id}' failed: ${getErrorMessage(error)}`);
    return undefined;
  }
};

const pruneDeletedRules = (
  rules: Record<string, PerRuleState>,
  customRules: CustomResolutionRule[]
): void => {
  const live = new Set(customRules.map(({ id }) => customRuleStateKey(id)));
  for (const key of Object.keys(rules)) {
    if (key.startsWith(CUSTOM_RULE_STATE_KEY_PREFIX) && !live.has(key)) {
      delete rules[key];
    }
  }
};

/**
 * Applies saved custom rules after the OOTB rules. Each rule is isolated: an
 * invalid or failing rule is logged and skipped, and nothing here throws.
 *
 * Rules run least recently attempted first, until `deadline`. A rule cut off
 * mid-scan keeps its previous watermark and repeats its query next run; the
 * matcher skips groups it already linked, so the links it made still count as
 * progress. The deadline bounds the run, so custom rules need no OOTB-style
 * one-first-scan-per-run slot.
 */
export async function runCustomResolutionRules(deps: RunCustomRulesDeps): Promise<void> {
  const { rules, resolutionRulesClient, logger, signal } = deps;

  const remainingMs = deps.deadline - Date.now();
  if (remainingMs <= 0) {
    logger.info('Skipping custom resolution rules this run; the soft deadline has passed');
    return;
  }

  let customRules: CustomResolutionRule[];
  try {
    customRules = await resolutionRulesClient.getCustomRules();
  } catch (error) {
    logger.warn(`Skipping custom resolution rules this run; failed to load them: ${error}`);
    return;
  }

  pruneDeletedRules(rules, customRules);

  const soft = new AbortController();
  const timer = setTimeout(() => soft.abort(), remainingMs);
  const onTaskAbort = () => soft.abort();
  signal.addEventListener('abort', onTaskAbort);
  if (signal.aborted) {
    soft.abort();
  }
  try {
    await runRulesUntil(deps, customRules, soft.signal);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onTaskAbort);
  }
}

async function runRulesUntil(
  deps: RunCustomRulesDeps,
  customRules: CustomResolutionRule[],
  softSignal: AbortSignal
): Promise<void> {
  const { previousRules, rules, index, esClient, logger, signal } = deps;
  const reachedDeadline = () => softSignal.aborted && !signal.aborted;
  const enabledRules = customRules
    .filter(({ enabled }) => enabled)
    .sort(byLeastRecentAttempt(previousRules));

  for (const [position, rule] of enabledRules.entries()) {
    if (softSignal.aborted) {
      const left = enabledRules.length - position;
      if (reachedDeadline()) {
        logger.info(
          `Custom resolution rules reached the soft deadline; ${left} rule(s) continue next run`
        );
      } else {
        logger.debug(`Aborted automated-resolution before custom rule '${rule.id}'`);
      }
      return;
    }

    const stateKey = customRuleStateKey(rule.id);
    const compiled = compileRule(rule, logger);
    if (!compiled) {
      continue;
    }
    const { spec, definitionHash } = compiled;

    const ruleState = readPriorState(previousRules[stateKey], definitionHash);
    const lastAttemptAt = new Date().toISOString();
    let next: PerRuleState = ruleState;
    try {
      next = await runEsqlMatcherRule({
        state: ruleState,
        namespace: deps.namespace,
        esClient,
        logger,
        resolutionClient: deps.resolutionClient,
        signal: softSignal,
        telemetry: deps.telemetry,
        spec,
        ruleId: stateKey,
        mutatedIds: deps.mutatedIds,
        index,
      });
      await esClient.indices.refresh({ index });
    } catch (error) {
      if (!reachedDeadline()) {
        logger.warn(`Custom resolution rule '${rule.id}' failed: ${getErrorMessage(error)}`);
      }
    }

    if (reachedDeadline()) {
      logger.info(`${stateKey}: stopped at the soft deadline; continues next run`);
    }

    // Written even when the rule failed or stopped early: the attempt time
    // orders the next run, and `next` still holds the previous watermark.
    const nextState: CustomRuleState = { ...next, definitionHash, lastAttemptAt };
    rules[stateKey] = nextState;
  }
}
