/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorMessage } from '../../../../../../common';
import { RESOLUTION_RULE_KINDS } from '../../../../../../common/domain/resolution_rules/constants';
import type { RegisterEntityMaintainerConfig } from '../../../../../tasks/entity_maintainers/types';
import { resolveLatestEntitiesIndexName } from '../../../../asset_manager/resolve_entity_store_indices';
import { ResolutionClient } from '../../..';
import {
  AUTOMATED_RESOLUTION_STATE_VERSION,
  EMPTY_RULE_STATE,
  type AutomatedResolutionState,
  type PerRuleState,
} from './types';
import { migrate } from './migrate';
import { RESOLUTION_RULE_CONFIGS } from '../..';
import { runEsqlMatcherRule } from '../../matcher';
import { runRelatedUserAliasResolution } from '../related_user_alias_resolution';
import { CUSTOM_RULES_DEADLINE_MARGIN_MS, runCustomResolutionRules } from './custom_rules';

export const MAINTAINER_ID = 'automated-resolution';

const MAINTAINER_TIMEOUT_MINUTES = 5;
const MAINTAINER_TIMEOUT_MS = MAINTAINER_TIMEOUT_MINUTES * 60 * 1000;

const createInitialState = (): AutomatedResolutionState => ({
  version: AUTOMATED_RESOLUTION_STATE_VERSION,
  rules: {},
});

export const automatedResolutionMaintainerConfig: RegisterEntityMaintainerConfig = {
  id: MAINTAINER_ID,
  description: 'Automatically resolves entities using built-in and custom resolution rules',
  interval: '5m',
  timeout: `${MAINTAINER_TIMEOUT_MINUTES}m`,
  initialState: createInitialState(),
  minLicense: 'enterprise',
  run: async ({ status, signal, logger, esClient, resolutionRulesClient, telemetry }) => {
    const runStartedAt = Date.now();
    const namespace = status.metadata.namespace;
    const state = migrate(status.state, logger);

    const index = await resolveLatestEntitiesIndexName(esClient, namespace);
    const resolutionClient = new ResolutionClient({
      logger,
      esClient,
      namespace,
      latestIndex: index,
    });
    const ruleStates: Record<string, PerRuleState> = { ...state.rules };
    const effectiveRules = new Map(
      (await resolutionRulesClient.getEffectiveRules()).map((rule) => [rule.id, rule])
    );
    const mutatedIds = new Set<string>();
    let backfillStarted = false;

    for (const ruleConfig of RESOLUTION_RULE_CONFIGS) {
      if (signal.aborted) {
        logger.debug(`Aborted automated-resolution before rule '${ruleConfig.id}'`);
        break;
      }

      const effectiveRule = effectiveRules.get(ruleConfig.id);
      if (!effectiveRule?.enabled) {
        logger.debug(`Skipping disabled resolution rule '${ruleConfig.id}'`);
        continue;
      }

      const ruleState = state.rules[ruleConfig.id] ?? EMPTY_RULE_STATE;
      const isMatcherBackfill =
        Boolean(ruleConfig.matcher) && ruleState.lastProcessedTimestamp == null;
      if (isMatcherBackfill) {
        if (backfillStarted) {
          logger.debug(
            `Deferring full-scan of resolution rule '${ruleConfig.id}'; another matcher is backfilling this tick`
          );
          continue;
        }
        backfillStarted = true;
      }

      try {
        if (ruleConfig.matcher) {
          ruleStates[ruleConfig.id] = await runEsqlMatcherRule({
            state: ruleState,
            esClient,
            logger,
            resolutionClient,
            signal,
            telemetry,
            spec: ruleConfig.matcher,
            ruleId: ruleConfig.id,
            mutatedIds,
            index,
          });
        } else if (ruleConfig.kind === RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION) {
          ruleStates[ruleConfig.id] = await runRelatedUserAliasResolution({
            state: ruleState,
            esClient,
            logger,
            resolutionClient,
            signal,
            telemetry,
            index,
          });
        } else {
          logger.warn(
            `Skipping resolution rule '${ruleConfig.id}': no matcher spec and unrecognized kind '${ruleConfig.kind}'`
          );
          continue;
        }

        await esClient.indices.refresh({ index });
      } catch (error) {
        logger.warn(`Resolution rule '${ruleConfig.id}' failed: ${error}`);
      }
    }

    if (!signal.aborted) {
      // A throw here would reject the run and lose the OOTB watermarks advanced above.
      try {
        await runCustomResolutionRules({
          ruleStates,
          resolutionRulesClient,
          index,
          esClient,
          logger,
          resolutionClient,
          signal,
          telemetry,
          mutatedIds,
          deadline: runStartedAt + MAINTAINER_TIMEOUT_MS - CUSTOM_RULES_DEADLINE_MARGIN_MS,
        });
      } catch (error) {
        logger.warn(`Custom resolution rules failed this run: ${getErrorMessage(error)}`);
      }
    }

    return { ...state, rules: ruleStates };
  },
};
