/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  buildRespondToActionUrl,
  type RespondToInboxActionResponse,
} from '@kbn/inbox-common';
import { queryKeys } from '../query_keys';

export interface RespondToInboxActionArgs {
  sourceApp: string;
  sourceId: string;
  input: Record<string, unknown>;
}

/**
 * React Query mutation that POSTs to the inbox respond route. On success the
 * cached action list is invalidated so the UI reflects the state transition
 * without a manual refetch.
 */
export const useRespondToInboxAction = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceApp,
      sourceId,
      input,
    }: RespondToInboxActionArgs): Promise<RespondToInboxActionResponse> =>
      services.http!.post<RespondToInboxActionResponse>(
        buildRespondToActionUrl(sourceApp, sourceId),
        {
          body: JSON.stringify({ input }),
          version: API_VERSIONS.internal.v1,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actions.all });
    },
  });
};
