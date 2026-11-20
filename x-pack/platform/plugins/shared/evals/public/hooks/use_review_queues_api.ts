/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  EVALS_REVIEW_QUEUES_URL,
  EVALS_REVIEW_QUEUE_AGREEMENT_URL,
  EVALS_REVIEW_QUEUE_ITEM_URL,
  EVALS_REVIEW_QUEUE_NEXT_URL,
  EVALS_REVIEW_QUEUE_URL,
  EVALS_TRACE_EVIDENCE_URL,
  type GetNextReviewItemResponse,
  type GetReviewQueueResponse,
  type GetTraceEvidenceResponse,
  type ListReviewQueuesResponse,
  type ReviewQueueAgreement,
  type SubmitReviewItemResponse,
} from '@kbn/evals-common';
import { queryKeys } from '../query_keys';

export interface SubmitReviewVerdictVariables {
  itemId: string;
  verdict: {
    label?: 'pass' | 'fail';
    value?: number;
    rationale?: string;
    skip?: boolean;
  };
}

const MAX_RETRIES = 3;

const retryOnServerError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= MAX_RETRIES) {
    return false;
  }
  if (isHttpFetchError(error)) {
    return !error.response?.status || error.response.status >= 500;
  }
  return true;
};

const queueUrl = (template: string, queueId: string): string =>
  template.replace('{queueId}', encodeURIComponent(queueId));

export const useReviewQueues = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.reviewQueues.list(),
    queryFn: async (): Promise<ListReviewQueuesResponse> =>
      services.http!.get<ListReviewQueuesResponse>(EVALS_REVIEW_QUEUES_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    retry: retryOnServerError,
    refetchOnWindowFocus: false,
  });
};

export const useReviewQueue = (queueId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.reviewQueues.detail(queueId),
    queryFn: async (): Promise<GetReviewQueueResponse> =>
      services.http!.get<GetReviewQueueResponse>(queueUrl(EVALS_REVIEW_QUEUE_URL, queueId), {
        version: API_VERSIONS.internal.v1,
      }),
    retry: retryOnServerError,
    refetchOnWindowFocus: false,
  });
};

/**
 * The next pending item, with the judge's verdict withheld. It is only refetched after a
 * submit, never on focus or mount, so a reviewer keeps the item they are looking at.
 */
export const useNextReviewItem = (queueId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.reviewQueues.next(queueId),
    queryFn: async (): Promise<GetNextReviewItemResponse> =>
      services.http!.get<GetNextReviewItemResponse>(
        queueUrl(EVALS_REVIEW_QUEUE_NEXT_URL, queueId),
        { version: API_VERSIONS.internal.v1 }
      ),
    retry: retryOnServerError,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    cacheTime: 0,
  });
};

export const useReviewQueueAgreement = (queueId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.reviewQueues.agreement(queueId),
    queryFn: async (): Promise<ReviewQueueAgreement> =>
      services.http!.get<ReviewQueueAgreement>(
        queueUrl(EVALS_REVIEW_QUEUE_AGREEMENT_URL, queueId),
        {
          version: API_VERSIONS.internal.v1,
        }
      ),
    retry: retryOnServerError,
    refetchOnWindowFocus: false,
  });
};

/**
 * Submitting does not refetch the next item: the page shows the revealed verdict first and
 * moves on when the reviewer asks to, via `refetchNext`.
 */
export const useSubmitReviewVerdict = (queueId: string) => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      verdict,
    }: SubmitReviewVerdictVariables): Promise<SubmitReviewItemResponse> =>
      services.http!.post<SubmitReviewItemResponse>(
        queueUrl(EVALS_REVIEW_QUEUE_ITEM_URL, queueId).replace(
          '{itemId}',
          encodeURIComponent(itemId)
        ),
        { body: JSON.stringify(verdict), version: API_VERSIONS.internal.v1 }
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueues.detail(queueId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueues.agreement(queueId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueues.list() }),
      ]);
    },
  });
};

export const useTraceEvidence = (traceId: string | undefined) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.traceEvidence.detail(traceId ?? ''),
    enabled: Boolean(traceId),
    queryFn: async (): Promise<GetTraceEvidenceResponse> =>
      services.http!.get<GetTraceEvidenceResponse>(
        EVALS_TRACE_EVIDENCE_URL.replace('{traceId}', encodeURIComponent(traceId ?? '')),
        { version: API_VERSIONS.internal.v1, query: { wait: 'stable' } }
      ),
    retry: retryOnServerError,
    refetchOnWindowFocus: false,
  });
};
