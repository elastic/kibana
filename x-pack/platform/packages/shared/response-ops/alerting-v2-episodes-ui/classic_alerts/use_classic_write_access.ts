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
  STACK_ALERTS_ONLY_FEATURE_ID,
} from '@kbn/rule-data-utils';
import type { CanWriteEpisode } from '../utils/episode_write_privilege';
import type { EpisodeWriteAccessServices } from '../types/episode_data_source';

/**
 * Resolves classic alert write access with the same table-wide check as the classic alerts table:
 * rule `all` on any rule type, or the `write` capability of an alerts-only feature.
 */
export const useClassicWriteAccess = ({
  application: { capabilities },
  http,
  notifications,
}: EpisodeWriteAccessServices): CanWriteEpisode => {
  const { authorizedToCreateAnyRules } = useGetRuleTypesPermissions({
    http,
    toasts: notifications.toasts,
    filteredRuleTypes: [],
  });

  const canWriteClassicAlerts =
    authorizedToCreateAnyRules ||
    Boolean(capabilities[OBSERVABILITY_ALERTS_FEATURE_ID]?.write) ||
    Boolean(capabilities[STACK_ALERTS_ONLY_FEATURE_ID]?.write);

  return useCallback(() => canWriteClassicAlerts, [canWriteClassicAlerts]);
};
