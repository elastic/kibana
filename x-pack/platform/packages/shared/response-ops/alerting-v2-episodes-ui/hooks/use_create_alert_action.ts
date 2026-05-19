/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { ALERT_EPISODE_ACTION_TYPE, type AlertEpisodeActionType } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';
import { queryKeys } from '../query_keys';

interface CreateAlertActionParams {
  groupHash: string;
  actionType: AlertEpisodeActionType;
  body?: Record<string, unknown>;
}

export const useCreateAlertAction = (http: HttpStart) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupHash, actionType, body = {} }: CreateAlertActionParams) => {
      await http.post(`${ALERTING_V2_ALERT_API_PATH}/${groupHash}/_${actionType}`, {
        body: JSON.stringify(body),
      });
    },
    onSuccess: (_data, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.actionsAll() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.groupActionsAll() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tagSuggestions() }),
        ...(variables.actionType === ALERT_EPISODE_ACTION_TYPE.TAG
          ? [queryClient.invalidateQueries({ queryKey: queryKeys.tagOptionsAll() })]
          : []),
      ]),
  });
};
