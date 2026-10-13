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
}

const readPriorState = (
  previous: PerRuleState | undefined,
  definitionHash: string
): PerRuleState => {
  if (!previous || (previous as Partial<CustomRuleState>).definitionHash !== definitionHash) {
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

/**
 * Applies saved custom rules after the OOTB rules. Each rule is isolated: an
 * invalid or failing rule is logged and skipped, and nothing here throws.
 *
 * Custom rules get their own first-scan slot, separate from the OOTB rules. A
 * rule only holds the slot when its scan finishes with a watermark, so a rule
 * that matches nothing or fails does not block the rules after it.
 */
export async function runCustomResolutionRules(deps: RunCustomRulesDeps): Promise<void> {
  const { previousRules, rules, resolutionRulesClient, index, esClient, logger, signal } = deps;

  let customRules: CustomResolutionRule[];
  try {
    customRules = await resolutionRulesClient.getCustomRules();
  } catch (error) {
    logger.warn(`Skipping custom resolution rules this run; failed to load them: ${error}`);
    return;
  }

  pruneDeletedRules(rules, customRules);

  let backfillTaken = false;
  for (const rule of customRules) {
    if (signal.aborted) {
      logger.debug(`Aborted automated-resolution before custom rule '${rule.id}'`);
      return;
    }
    if (!rule.enabled) {
      continue;
    }

    const stateKey = customRuleStateKey(rule.id);
    try {
      const spec = toExpressionMatchSpec(toRuleDefinition(rule));
      const definitionHash = fingerprintMatchSpec(spec);
      const ruleState = readPriorState(previousRules[stateKey], definitionHash);
      const isBackfill = ruleState.lastProcessedTimestamp == null;
      if (isBackfill && backfillTaken) {
        logger.debug(
          `Deferring full-scan of custom resolution rule '${rule.id}'; another custom rule is backfilling this tick`
        );
        continue;
      }

      const next = await runEsqlMatcherRule({
        state: ruleState,
        namespace: deps.namespace,
        esClient,
        logger,
        resolutionClient: deps.resolutionClient,
        signal,
        telemetry: deps.telemetry,
        spec,
        ruleId: stateKey,
        mutatedIds: deps.mutatedIds,
        index,
      });
      const nextState: CustomRuleState = { ...next, definitionHash };
      rules[stateKey] = nextState;
      if (isBackfill && next.lastProcessedTimestamp != null) {
        backfillTaken = true;
      }

      await esClient.indices.refresh({ index });
    } catch (error) {
      logger.warn(`Custom resolution rule '${rule.id}' failed: ${getErrorMessage(error)}`);
    }
  }
}
