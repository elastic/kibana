/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  INVESTIGATION_ASSIGN_URL,
  INVESTIGATION_STATUS_URL,
  INVESTIGATION_CLOSE_PREVIEW_URL,
} from '../../../common';
import type {
  SetInvestigationStatusRequest,
  SetInvestigationStatusResponse,
  InvestigationClosePreviewResponse,
} from '../../../common';

/** Replaces the assignee list on an investigation (replace-in-full semantics). */
export const useAssignInvestigation = () => {
  const { services } = useKibana<CoreStart>();

  return useMutation({
    mutationFn: ({
      investigationId,
      assignees,
    }: {
      investigationId: string;
      assignees: string[];
    }) =>
      services.http.put(
        INVESTIGATION_ASSIGN_URL.replace('{id}', encodeURIComponent(investigationId)),
        {
          version: AGENTIC_INVESTIGATIONS_API_VERSION,
          body: JSON.stringify({ assignees }),
        }
      ),
    // No query invalidation: the investigation flyout polls its own isolated QueryClient
    // every 5 s (Agent Builder's snapshot interval). The caller is responsible for triggering
    // a refetch via `refetchConversation` after a successful mutation.
  });
};

/** Opens or closes an investigation, optionally bulk-dismissing its pending proposals. */
export const useSetInvestigationStatus = () => {
  const { services } = useKibana<CoreStart>();

  return useMutation({
    mutationFn: ({
      investigationId,
      body,
    }: {
      investigationId: string;
      body: SetInvestigationStatusRequest;
    }): Promise<SetInvestigationStatusResponse> =>
      services.http.put<SetInvestigationStatusResponse>(
        INVESTIGATION_STATUS_URL.replace('{id}', encodeURIComponent(investigationId)),
        {
          version: AGENTIC_INVESTIGATIONS_API_VERSION,
          body: JSON.stringify(body),
        }
      ),
  });
};

/** Fetches a preview of what closing an investigation would affect (pending proposal count). */
export const useInvestigationClosePreview = (
  investigationId: string | undefined,
  { enabled }: { enabled: boolean }
) => {
  const { services } = useKibana<CoreStart>();

  return useQuery({
    queryKey: ['agenticInvestigations', 'investigations', 'closePreview', investigationId],
    queryFn: (): Promise<InvestigationClosePreviewResponse> =>
      services.http.get<InvestigationClosePreviewResponse>(
        INVESTIGATION_CLOSE_PREVIEW_URL.replace('{id}', encodeURIComponent(investigationId!)),
        { version: AGENTIC_INVESTIGATIONS_API_VERSION }
      ),
    enabled: enabled && Boolean(investigationId),
  });
};
