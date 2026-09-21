/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  ESCALATIONS_INTERNAL_URL,
  ESCALATION_BY_ID_URL,
} from '../../../common';
import type {
  CreateEscalationRequest,
  EscalationConversation,
  ListEscalationsResponse,
} from '../../../common';
import { retryOnTransientError } from '../../proposals/hooks/use_proposals_api';
import { escalationQueryKeys } from '../query_keys';


export const useListEscalations = (searchQuery?: string) => {
  const { services } = useKibana<CoreStart>();
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useDebounce(() => setDebouncedSearch(searchQuery), 300, [searchQuery]);

  return useQuery({
    queryKey: escalationQueryKeys.escalations.list(debouncedSearch),
    queryFn: async (): Promise<ListEscalationsResponse> =>
      services.http!.get<ListEscalationsResponse>(ESCALATIONS_INTERNAL_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        query: debouncedSearch ? { search: debouncedSearch } : undefined,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

export const useCreateEscalation = () => {
  const { services } = useKibana<CoreStart>();

  return useMutation({
    mutationFn: (body: CreateEscalationRequest): Promise<EscalationConversation> =>
      services.http!.post<EscalationConversation>(ESCALATIONS_INTERNAL_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        body: JSON.stringify(body),
      }),
  });
};

export const useAddToEscalation = () => {
  const { services } = useKibana<CoreStart>();

  return useMutation({
    mutationFn: ({
      escalationId,
      linkedInvestigationId,
    }: {
      escalationId: string;
      linkedInvestigationId: string;
    }): Promise<EscalationConversation> =>
      services.http!.patch<EscalationConversation>(
        ESCALATION_BY_ID_URL.replace('{id}', encodeURIComponent(escalationId)),
        {
          version: AGENTIC_INVESTIGATIONS_API_VERSION,
          body: JSON.stringify({ linked_investigations: [linkedInvestigationId] }),
        }
      ),
  });
};
