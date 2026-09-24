/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  ESCALATION_ASSIGN_URL,
  ESCALATION_LINKED_INVESTIGATIONS_URL,
  ESCALATIONS_INTERNAL_URL,
  ESCALATION_BY_ID_URL,
} from '../../../common';
import type {
  CreateEscalationRequest,
  EscalationConversation,
  LinkedInvestigationSummary,
  ListEscalationsResponse,
  ListLinkedInvestigationsResponse,
  UpdateEscalationRequest,
} from '../../../common';
import { retryOnTransientError } from '../../retry_on_transient_error';
import { escalationQueryKeys } from '../query_keys';

/**
 * Invalidates the full escalations list query so any open list view reflects the change.
 * Uses the `all` root key to sweep every status/search/page variant.
 */
const invalidateEscalations = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: escalationQueryKeys.all });
};

/** Lists escalations, optionally filtered by status/page/perPage and with debounced search. */
export const useListEscalations = ({
  status,
  page,
  perPage,
  searchQuery,
}: {
  status?: 'open' | 'closed' | 'all';
  page?: number;
  perPage?: number;
  searchQuery?: string;
} = {}) => {
  const { services } = useKibana<CoreStart>();
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useDebounce(() => setDebouncedSearch(searchQuery), 300, [searchQuery]);

  return useQuery({
    queryKey: escalationQueryKeys.list(status, page, perPage, debouncedSearch),
    queryFn: async (): Promise<ListEscalationsResponse> =>
      services.http.get<ListEscalationsResponse>(ESCALATIONS_INTERNAL_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        query: {
          ...(status !== undefined ? { status } : {}),
          ...(page !== undefined ? { page } : {}),
          ...(perPage !== undefined ? { per_page: perPage } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

export const useCreateEscalation = () => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateEscalationRequest): Promise<EscalationConversation> =>
      services.http.post<EscalationConversation>(ESCALATIONS_INTERNAL_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateEscalations(queryClient),
  });
};

export const useAddToEscalation = () => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      escalationId,
      linkedInvestigationId,
    }: {
      escalationId: string;
      linkedInvestigationId: string;
    }): Promise<EscalationConversation> =>
      services.http.patch<EscalationConversation>(
        ESCALATION_BY_ID_URL.replace('{id}', encodeURIComponent(escalationId)),
        {
          version: AGENTIC_INVESTIGATIONS_API_VERSION,
          body: JSON.stringify({ linked_investigations: [linkedInvestigationId] }),
        }
      ),
    onSuccess: () => invalidateEscalations(queryClient),
  });
};

/** Replaces the assignee list on an escalation (replace-in-full semantics). */
export const useAssignEscalation = () => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ escalationId, assignees }: { escalationId: string; assignees: string[] }) =>
      services.http.put(ESCALATION_ASSIGN_URL.replace('{id}', encodeURIComponent(escalationId)), {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        body: JSON.stringify({ assignees }),
      }),
    onSuccess: () => invalidateEscalations(queryClient),
  });
};

/**
 * Fetches the linked investigations for an escalation.
 *
 * The query key includes the comma-joined list of linked investigation ids read from the
 * escalation's metadata so that the flyout's 5 s poll triggers a re-fetch when a new
 * investigation is linked. Pass `linkedInvestigationIds` from the live conversation object
 * that the flyout already holds.
 */
export const useLinkedInvestigations = ({
  escalationId,
  linkedInvestigationIds,
}: {
  escalationId: string;
  linkedInvestigationIds: readonly string[];
}): { data: LinkedInvestigationSummary[] | undefined; isLoading: boolean; isError: boolean } => {
  const { services } = useKibana<CoreStart>();
  const linkedIds = linkedInvestigationIds.join(',');

  const result = useQuery({
    queryKey: escalationQueryKeys.linkedInvestigations(escalationId, linkedIds),
    queryFn: async (): Promise<ListLinkedInvestigationsResponse> =>
      services.http.get<ListLinkedInvestigationsResponse>(
        ESCALATION_LINKED_INVESTIGATIONS_URL.replace('{id}', encodeURIComponent(escalationId)),
        { version: AGENTIC_INVESTIGATIONS_API_VERSION }
      ),
    retry: retryOnTransientError,
  });

  return { data: result.data?.results, isLoading: result.isLoading, isError: result.isError };
};

/** Patches an escalation. Invalidates the full escalations query key on success. */
export const useUpdateEscalation = () => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ escalationId, body }: { escalationId: string; body: UpdateEscalationRequest }) =>
      services.http.patch(ESCALATION_BY_ID_URL.replace('{id}', encodeURIComponent(escalationId)), {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateEscalations(queryClient),
  });
};
