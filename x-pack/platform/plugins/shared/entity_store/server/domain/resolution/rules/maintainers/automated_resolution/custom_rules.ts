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
  fingerprintDefinition,
  toExpressionMatchSpec,
  toRuleDefinition,
  type CustomResolutionRule,
} from '../../custom';
import { runEsqlMatcherRule } from '../../matcher';
import type { ResolutionRulesClient } from '../../rule_client';
import type { EsqlExpressionMatchSpec } from '../../rule_registry';
import type { CustomRuleState, PerRuleState } from './types';

const EMPTY_RULE_STATE: PerRuleState = { lastProcessedTimestamp: null, lastRun: null };

/** Time left before the maintainer's task timeout when custom rules stop. */
export const CUSTOM_RULES_DEADLINE_MARGIN_MS = 60 * 1000;

/** Telemetry scope value for every custom rule; ids are per deployment. */
const CUSTOM_RULE_TELEMETRY_ID = 'custom';

export interface RunCustomRulesDeps {
  /**
   * Rule state for this run, starting as the state read at the start of the
   * run. Custom-rule entries are read, written and pruned here.
   */
  rules: Record<string, PerRuleState>;
  resolutionRulesClient: ResolutionRulesClient;
  index: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  resolutionClient: ResolutionClient;
  signal: AbortSignal;
  telemetry: MaintainerTelemetryClient;
  mutatedIds: Set<string>;
  /**
   * Epoch ms after which no custom rule starts and a running one stops between
   * groups. A run that ends on its own saves every rule's state; a run Task
   * Manager cancels saves none, OOTB rules included.
   */
  deadline: number;
}

const asCustomState = (state: PerRuleState | undefined): Partial<CustomRuleState> =>
  (state ?? {}) as Partial<CustomRuleState>;

const byCreation = (a: CustomResolutionRule, b: CustomResolutionRule): number =>
  (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id);

/**
 * Oldest rule first, so the order is stable and explainable. A rule the
 * deadline cut off last run goes last, so one heavy rule can't starve the
 * others; among those, the least recently attempted goes first.
 */
export const orderForRun = (
  customRules: CustomResolutionRule[],
  rules: Readonly<Record<string, PerRuleState>>
): CustomResolutionRule[] => {
  const stateOf = (rule: CustomResolutionRule) => asCustomState(rules[customRuleStateKey(rule.id)]);
  const cutOff = customRules.filter((rule) => stateOf(rule).stoppedAtDeadline === true);
  const rest = customRules.filter((rule) => stateOf(rule).stoppedAtDeadline !== true);
  return [
    ...rest.sort(byCreation),
    ...cutOff.sort(
      (a, b) =>
        (stateOf(a).lastAttemptAt ?? '').localeCompare(stateOf(b).lastAttemptAt ?? '') ||
        byCreation(a, b)
    ),
  ];
};

const readPriorState = (
  previous: PerRuleState | undefined,
  definitionFingerprint: string
): PerRuleState => {
  if (!previous || asCustomState(previous).definitionFingerprint !== definitionFingerprint) {
    return EMPTY_RULE_STATE;
  }
  return { lastProcessedTimestamp: previous.lastProcessedTimestamp, lastRun: previous.lastRun };
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

const compileRule = (
  rule: CustomResolutionRule,
  logger: Logger
): { spec: EsqlExpressionMatchSpec; definitionFingerprint: string } | undefined => {
  try {
    const definition = toRuleDefinition(rule);
    return {
      spec: toExpressionMatchSpec(definition),
      definitionFingerprint: fingerprintDefinition(definition),
    };
  } catch (error) {
    logger.warn(`Custom resolution rule '${rule.id}' failed: ${getErrorMessage(error)}`);
    return undefined;
  }
};

/**
 * Applies saved custom rules after the OOTB rules. Each rule is isolated: an
 * invalid or failing rule is logged and skipped, and nothing here throws.
 *
 * Rules run in `orderForRun` order until `deadline`. A rule cut off
 * mid-scan keeps its previous watermark and repeats its query next run; the
 * matcher skips groups it already linked, so the links it made still count as
 * progress.
 */
export async function runCustomResolutionRules(deps: RunCustomRulesDeps): Promise<void> {
  const { rules, resolutionRulesClient, logger, signal } = deps;

  let customRules: CustomResolutionRule[];
  try {
    customRules = await resolutionRulesClient.getCustomRules();
  } catch (error) {
    logger.warn(`Skipping custom resolution rules this run; failed to load them: ${error}`);
    return;
  }

  pruneDeletedRules(rules, customRules);

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
  softSignal: AbortSignal
): Promise<void> {
  const { rules, resolutionRulesClient, index, esClient, logger, signal } = deps;
  const reachedDeadline = () => softSignal.aborted && !signal.aborted;
  const enabledRules = orderForRun(
    customRules.filter(({ enabled }) => enabled),
    rules
  );
  if (enabledRules.length > 0) {
    logger.info(
      `Custom resolution rules this run, in order: ${enabledRules
        .map(({ id }) => customRuleStateKey(id))
        .join(', ')}`
    );
  }

  for (const [position, listed] of enabledRules.entries()) {
    if (softSignal.aborted) {
      const left = enabledRules.length - position;
      if (reachedDeadline()) {
        logger.info(
          `Custom resolution rules reached the soft deadline; ${left} rule(s) continue next run`
        );
      } else {
        logger.debug(`Aborted automated-resolution before custom rule '${listed.id}'`);
      }
      return;
    }

    // Re-read right before running: a disable, delete or edit since the list
    // was loaded must take effect now, not after the deadline.
    let rule: CustomResolutionRule | undefined;
    try {
      rule = await resolutionRulesClient.getCustomRule(listed.id);
    } catch (error) {
      logger.warn(`Custom resolution rule '${listed.id}' failed: ${getErrorMessage(error)}`);
      continue;
    }
    if (!rule?.enabled) {
      logger.debug(
        `Skipping custom resolution rule '${listed.id}': disabled or deleted since load`
      );
      continue;
    }

    const stateKey = customRuleStateKey(rule.id);
    const compiled = compileRule(rule, logger);
    if (!compiled) {
      continue;
    }
    const { spec, definitionFingerprint } = compiled;

    const ruleState = readPriorState(rules[stateKey], definitionFingerprint);
    const lastAttemptAt = new Date().toISOString();
    let matcherResultState: PerRuleState = ruleState;
    try {
      matcherResultState = await runEsqlMatcherRule({
        state: ruleState,
        esClient,
        logger,
        resolutionClient: deps.resolutionClient,
        signal: softSignal,
        telemetry: deps.telemetry,
        spec,
        ruleId: stateKey,
        telemetryRuleId: CUSTOM_RULE_TELEMETRY_ID,
        mutatedIds: deps.mutatedIds,
        index,
      });
      await esClient.indices.refresh({ index });
    } catch (error) {
      if (!reachedDeadline()) {
        logger.warn(`Custom resolution rule '${rule.id}' failed: ${getErrorMessage(error)}`);
      }
    }

    const stoppedAtDeadline = reachedDeadline();
    if (stoppedAtDeadline) {
      logger.info(`${stateKey}: stopped at the soft deadline; continues next run`);
    }

    // Written even when the rule failed or stopped early: the attempt fields
    // order the next run, and the state still holds the previous watermark.
    const nextState: CustomRuleState = {
      ...matcherResultState,
      definitionFingerprint,
      lastAttemptAt,
      stoppedAtDeadline,
    };
    rules[stateKey] = nextState;
  }
}
