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
  OBS_ALERTING_FEATURES,
  STACK_ALERTING_FEATURES,
  STACK_ALERTS_ONLY_FEATURE_ID,
} from '@kbn/rule-data-utils';
import type { AlertEpisode } from '../queries/episodes_query';
import type { CanWriteEpisode } from '../utils/episode_write_privilege';
import type { EpisodeWriteAccessServices } from '../types/episode_data_source';
import type { ClassicAlertActionContext } from './utils/map_alert';

const indexGrantedConsumers = (
  alertingFeatures: Array<{ ruleTypeId: string; consumers: string[] }>
): Map<string, Set<string>> => {
  const index = new Map<string, Set<string>>();
  for (const { ruleTypeId, consumers } of alertingFeatures) {
    const granted = index.get(ruleTypeId) ?? new Set<string>();
    for (const consumer of consumers) {
      granted.add(consumer);
    }
    index.set(ruleTypeId, granted);
  }
  return index;
};

const OBSERVABILITY_ALERTS_GRANTS = indexGrantedConsumers(OBS_ALERTING_FEATURES);
const STACK_ALERTS_GRANTS = indexGrantedConsumers(STACK_ALERTING_FEATURES);

/**
 * Resolves classic alert write access per row, since the Observability and Stack features grant it
 * over different rule type and consumer combinations. The alerts-only features expose their
 * `alert:all` / `rule:mute_alerts` privileges as a `write` UI capability, while the solution
 * features grant them along with rule privileges, which authorization reports per rule type.
 */
export const useClassicWriteAccess = ({
  application,
  http,
  notifications,
}: EpisodeWriteAccessServices): CanWriteEpisode => {
  const { ruleTypesState } = useGetRuleTypesPermissions({
    http,
    toasts: notifications.toasts,
    filteredRuleTypes: [],
  });
  const ruleTypes = ruleTypesState.data;

  const { capabilities } = application;
  const canWriteObservabilityAlerts = Boolean(capabilities[OBSERVABILITY_ALERTS_FEATURE_ID]?.write);
  const canWriteStackAlerts = Boolean(capabilities[STACK_ALERTS_ONLY_FEATURE_ID]?.write);

  return useCallback(
    (episode: AlertEpisode) => {
      const { ruleTypeId, consumer } = (episode.source_action_context ??
        {}) as ClassicAlertActionContext;
      if (!ruleTypeId || !consumer) {
        return false;
      }

      return (
        Boolean(ruleTypes.get(ruleTypeId)?.authorizedConsumers[consumer]?.all) ||
        Boolean(
          canWriteObservabilityAlerts && OBSERVABILITY_ALERTS_GRANTS.get(ruleTypeId)?.has(consumer)
        ) ||
        Boolean(canWriteStackAlerts && STACK_ALERTS_GRANTS.get(ruleTypeId)?.has(consumer))
      );
    },
    [ruleTypes, canWriteObservabilityAlerts, canWriteStackAlerts]
  );
};
