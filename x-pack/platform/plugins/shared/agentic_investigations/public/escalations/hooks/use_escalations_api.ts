/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  ESCALATIONS_INTERNAL_URL,
  ESCALATION_BY_ID_URL,
} from '../../../common';
import type { ListEscalationsResponse, UpdateEscalationRequest } from '../../../common';
import { retryOnTransientError } from '../../proposals/hooks/use_proposals_api';
import { escalationQueryKeys } from '../query_keys';

/** Lists escalations filtered by status. `status` defaults to `'open'` on the server. */
export const useListEscalations = ({
  status,
  page,
  perPage,
}: {
  status: 'open' | 'closed' | 'all';
  page?: number;
  perPage?: number;
}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: escalationQueryKeys.list(status),
    queryFn: async (): Promise<ListEscalationsResponse> =>
      services.http!.get<ListEscalationsResponse>(ESCALATIONS_INTERNAL_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        query: {
          status,
          ...(page !== undefined ? { page } : {}),
          ...(perPage !== undefined ? { per_page: perPage } : {}),
        },
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

/** Patches an escalation. Invalidates the full escalations query key on success. */
export const useUpdateEscalation = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ escalationId, body }: { escalationId: string; body: UpdateEscalationRequest }) =>
      services.http!.patch(ESCALATION_BY_ID_URL.replace('{id}', encodeURIComponent(escalationId)), {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: escalationQueryKeys.all });
    },
  });
};
