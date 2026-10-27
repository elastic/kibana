/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { uniqBy } from 'lodash';
import { useInfiniteQuery, useQueryClient } from '@kbn/react-query';
import type { InfiniteData, QueryKey } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { ProposalOrigin } from '@kbn/proposals-common';
import type { PagedImpactPills } from '@kbn/agentic-investigations-common';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  IMPACT_ESCALATION_SUMMARY_URL,
  IMPACT_PILLS_PAGE_SIZE,
  IMPACT_PROPOSAL_SUMMARY_URL,
  MAX_IMPACT_PILLS_REACH,
} from '../../../common';
import type { ImpactPillsResponse } from '../../../common';
import { impactPillsQueryKeys } from '../query_keys';
import { retryOnTransientError } from '../../retry_on_transient_error';

const nextOffset = (lastPage: ImpactPillsResponse, pages: ImpactPillsResponse[]) => {
  const loaded = pages.reduce((count, page) => count + page.pills.length, 0);
  return lastPage.remaining > 0 && loaded < MAX_IMPACT_PILLS_REACH ? loaded : undefined;
};

const useImpactPillsPages = ({
  queryKey,
  url,
  query,
  enabled = true,
}: {
  queryKey: QueryKey;
  url: string;
  query: Record<string, unknown>;
  enabled?: boolean;
}): PagedImpactPills => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: number }): Promise<ImpactPillsResponse> =>
      services.http.get<ImpactPillsResponse>(url, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        query: { ...query, from: pageParam ?? 0, size: IMPACT_PILLS_PAGE_SIZE },
      }),
    getNextPageParam: nextOffset,
    enabled,
    keepPreviousData: true,
    retry: retryOnTransientError,
  });

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const pills = useMemo(
    () =>
      uniqBy(
        pages.flatMap((page) => page.pills),
        'entityId'
      ),
    [pages]
  );
  const showMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);
  const showFewer = useCallback(() => {
    queryClient.setQueryData<InfiniteData<ImpactPillsResponse>>(queryKey, (current) =>
      current
        ? { pages: current.pages.slice(0, 1), pageParams: current.pageParams.slice(0, 1) }
        : current
    );
  }, [queryClient, queryKey]);

  return {
    pills,
    total: pages[0]?.total ?? 0,
    remaining: pages[pages.length - 1]?.remaining ?? 0,
    canShowMore: hasNextPage === true,
    reachLimit: MAX_IMPACT_PILLS_REACH,
    loadFailed: isError,
    isLoadingMore: isFetchingNextPage,
    showMore,
    ...(pages.length > 1 ? { showFewer } : {}),
  };
};

/** Entity pills across a whole proposal queue; the page that shows them refreshes them. */
export const useProposalImpactPills = ({
  origin,
  categories,
  decidedWithinHours,
}: {
  origin: ProposalOrigin;
  categories: readonly string[];
  decidedWithinHours?: number;
}): PagedImpactPills =>
  useImpactPillsPages({
    queryKey: [...impactPillsQueryKeys.proposals(), origin, categories, decidedWithinHours ?? null],
    url: IMPACT_PROPOSAL_SUMMARY_URL,
    query: {
      origin,
      categories: [...categories],
      ...(decidedWithinHours !== undefined ? { decidedWithinHours } : {}),
    },
  });

/** The entities across every open and closed escalation. */
export const useEscalationImpactPills = ({
  enabled = true,
}: { enabled?: boolean } = {}): PagedImpactPills =>
  useImpactPillsPages({
    queryKey: impactPillsQueryKeys.escalations(),
    url: IMPACT_ESCALATION_SUMMARY_URL,
    query: {},
    enabled,
  });
