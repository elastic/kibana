/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import {
  OBSERVABILITY_ALERTS_FEATURE_ID,
  OBSERVABILITY_RULE_TYPE_IDS,
  STACK_ALERTS_ONLY_FEATURE_ID,
  STACK_RULE_TYPE_IDS,
  STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
} from '@kbn/rule-data-utils';
import type { AlertEpisode } from '../queries/episodes_query';
import type { CanWriteEpisode } from '../utils/episode_write_privilege';
import type { EpisodeWriteAccessServices } from '../types/episode_data_source';
import type { ClassicAlertActionContext } from './utils/map_alert';

const OBSERVABILITY_ALERTS_RULE_TYPE_IDS = new Set<string>([
  ...OBSERVABILITY_RULE_TYPE_IDS,
  ...STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
]);
const STACK_ALERTS_RULE_TYPE_IDS = new Set<string>(STACK_RULE_TYPE_IDS);

/**
 * Mirrors the classic alerts pages: each alerts-only feature grants write access through its
 * `write` UI capability for the rule types its page lists, and rule-create authorization grants it
 * for every rule type. The `write` capability and the RAC `alert:all` / `rule:mute_alerts`
 * privileges it stands in for are not otherwise exposed to the browser.
 */
export const useClassicWriteAccess = ({
  application,
  http,
  notifications,
}: EpisodeWriteAccessServices): CanWriteEpisode => {
  const { authorizedToCreateAnyRules } = useGetRuleTypesPermissions({
    http,
    toasts: notifications.toasts,
    filteredRuleTypes: [],
  });

  const { capabilities } = application;
  const canWriteObservabilityAlerts = Boolean(capabilities[OBSERVABILITY_ALERTS_FEATURE_ID]?.write);
  const canWriteStackAlerts = Boolean(capabilities[STACK_ALERTS_ONLY_FEATURE_ID]?.write);

  return useCallback(
    (episode: AlertEpisode) => {
      if (authorizedToCreateAnyRules) {
        return true;
      }

      const { ruleTypeId } = (episode.source_action_context ?? {}) as ClassicAlertActionContext;
      if (!ruleTypeId) {
        return canWriteObservabilityAlerts || canWriteStackAlerts;
      }

      return (
        (canWriteObservabilityAlerts && OBSERVABILITY_ALERTS_RULE_TYPE_IDS.has(ruleTypeId)) ||
        (canWriteStackAlerts && STACK_ALERTS_RULE_TYPE_IDS.has(ruleTypeId))
      );
    },
    [authorizedToCreateAnyRules, canWriteObservabilityAlerts, canWriteStackAlerts]
  );
};
