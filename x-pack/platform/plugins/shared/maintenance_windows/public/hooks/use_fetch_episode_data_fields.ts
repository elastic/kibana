/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_ACTION_POLICY_API_PATH } from '@kbn/alerting-v2-constants';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../utils/kibana_react';

const EPISODE_DATA_FIELDS_PATH = `${ALERTING_V2_ACTION_POLICY_API_PATH}/suggestions/data_fields`;

/**
 * Fetches v2 episode `data.*` field name suggestions from the alerting_v2
 * suggestions endpoint. Reused (not imported) from alerting_v2 to avoid a
 * maintenance_windows → alerting_v2 plugin dependency. Returns an empty list
 * when the user lacks `actionPolicies.read` privilege so autocompletion still
 * works for the well-known matcher context fields.
 */
export const useFetchEpisodeDataFields = () => {
  const { http } = useKibana().services;

  return useQuery<string[], Error>({
    queryKey: ['maintenanceWindows', 'episodeDataFields'],
    queryFn: async () => {
      try {
        return await http.get<string[]>(EPISODE_DATA_FIELDS_PATH);
      } catch {
        return [];
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });
};
