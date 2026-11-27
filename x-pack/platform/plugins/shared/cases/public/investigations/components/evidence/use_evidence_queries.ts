/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@kbn/react-query';
import type {
  ClaimItem,
  CommentItem,
  EntityItem,
  FindItemsRequest,
  ExportItemsRequest,
} from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { findItems } from '../../api/client';
import { useItems } from '../../hooks';
import { useInvestigationsServices } from '../../services';
import {
  exportEvidenceFile,
  findSavedObjectChoices,
  lookupIndicatorsExcluding,
  searchAlerts,
} from './evidence_api';
import type { EvidenceExport } from './evidence_api';
import { getMaxAddressablePageIndex } from './evidence_state';
import type { EvidenceFilterRequest } from './evidence_state';

export interface UseEvidencePageResult {
  data: ReturnType<typeof useItems>['data'];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
  /** The requested page lies beyond the end of the results. */
  isOutOfRange: boolean;
}

/**
 * One page of evidence with facet counts. Pages up to the server's 10,000 item window use page
 * numbers; deeper pages use the `next_cursor` of the page before, walking forward when the
 * cursor of the requested page is not known yet.
 */
export const useEvidencePage = (
  recordId: string,
  filter: EvidenceFilterRequest,
  pageIndex: number,
  pageSize: number,
  evidenceCount: number
): UseEvidencePageResult => {
  const { http } = useInvestigationsServices();
  const signature = JSON.stringify([recordId, filter, pageSize, evidenceCount]);
  const cursors = useRef<{ signature: string; byPage: Map<number, string> }>({
    signature,
    byPage: new Map(),
  });
  if (cursors.current.signature !== signature) {
    cursors.current = { signature, byPage: new Map() };
  }
  const [cursorVersion, setCursorVersion] = useState(0);
  const [isOutOfRange, setIsOutOfRange] = useState(false);

  const maxAddressable = getMaxAddressablePageIndex(pageSize);
  const isDeep = pageIndex > maxAddressable;
  const cursor = isDeep ? cursors.current.byPage.get(pageIndex) : undefined;

  const request: FindItemsRequest = {
    ...filter,
    per_page: pageSize,
    facets: true,
    ...(isDeep ? { cursor } : { page: pageIndex + 1 }),
  };
  const query = useItems(recordId, request, { enabled: !isDeep || cursor !== undefined });
  const { data, isPreviousData } = query;

  useEffect(() => {
    if (data?.next_cursor && !isPreviousData) {
      cursors.current.byPage.set(pageIndex + 1, data.next_cursor);
    }
  }, [data, isPreviousData, pageIndex]);

  useEffect(() => {
    setIsOutOfRange(false);
    if (!isDeep || cursor !== undefined) {
      return;
    }
    let isCancelled = false;
    const { byPage } = cursors.current;

    const walk = async () => {
      const knownPages = Array.from(byPage.keys()).filter((page) => page < pageIndex);
      let page = knownPages.length ? Math.max(...knownPages) : maxAddressable;
      let current = byPage.get(page);
      while (page < pageIndex && !isCancelled) {
        const response = await findItems(http, recordId, {
          ...filter,
          per_page: pageSize,
          ...(current ? { cursor: current } : { page: page + 1 }),
        });
        if (!response.next_cursor) {
          if (!isCancelled) setIsOutOfRange(true);
          return;
        }
        page += 1;
        current = response.next_cursor;
        byPage.set(page, current);
      }
      if (!isCancelled) setCursorVersion((version) => version + 1);
    };

    walk().catch(() => {
      if (!isCancelled) setIsOutOfRange(true);
    });
    return () => {
      isCancelled = true;
    };
    // `cursorVersion` re-runs the page request once the walk stored the cursor.
  }, [cursor, cursorVersion, filter, http, isDeep, maxAddressable, pageIndex, pageSize, recordId]);

  return {
    data,
    isLoading: query.isLoading || (isDeep && cursor === undefined && !isOutOfRange),
    isFetching: query.isFetching || (isDeep && cursor === undefined && !isOutOfRange),
    error: query.error,
    refetch: () => void query.refetch(),
    isOutOfRange,
  };
};

const MAX_LOOKUP_VALUES = 500;

/** Other investigations that hold the given indicator values: one request for the whole page. */
export const useSeenElsewhere = (recordId: string, values: string[]) => {
  const { http } = useInvestigationsServices();
  const unique = useMemo(
    () => Array.from(new Set(values.map((value) => value.trim()))).slice(0, MAX_LOOKUP_VALUES),
    [values]
  );

  return useQuery(
    ['investigations', 'indicator_lookup', recordId, unique],
    () => lookupIndicatorsExcluding(http, unique, recordId),
    { enabled: unique.length > 0, retry: false, keepPreviousData: true, staleTime: 60 * 1000 }
  );
};

/** The record's claims (a record holds fewer than 100) for "Used in" and "Link to claim". */
export const useRecordClaims = (recordId: string) => {
  const query = useItems(recordId, {
    kind: ['claim'],
    per_page: INVESTIGATION_LIMITS.maxPerPage,
    sort_field: 'ref_num',
    sort_order: 'asc',
  });
  const claims = useMemo<ClaimItem[]>(
    () => (query.data?.items ?? []).filter((item): item is ClaimItem => item.kind === 'claim'),
    [query.data]
  );
  return { claims, isLoading: query.isLoading, error: query.error };
};

/** Scope entities of the record, for the Entity form. */
export const useRecordEntities = (recordId: string, enabled: boolean) => {
  const query = useItems(
    recordId,
    {
      kind: ['entity'],
      per_page: INVESTIGATION_LIMITS.maxPerPage,
      sort_field: 'ref_num',
      sort_order: 'asc',
    },
    { enabled }
  );
  const entities = useMemo<EntityItem[]>(
    () => (query.data?.items ?? []).filter((item): item is EntityItem => item.kind === 'entity'),
    [query.data]
  );
  return { entities, isLoading: query.isLoading, error: query.error };
};

/** Comment counts per evidence item, exact while the record has at most one page of comments. */
export const useCommentCounts = (recordId: string, commentCount: number) => {
  const query = useItems(
    recordId,
    {
      kind: ['comment'],
      per_page: INVESTIGATION_LIMITS.maxPerPage,
      sort_field: 'created_at',
      sort_order: 'desc',
    },
    { enabled: commentCount > 0 }
  );
  return useMemo(() => {
    const counts = new Map<string, number>();
    (query.data?.items ?? []).forEach((item) => {
      if (item.kind !== 'comment') return;
      const targetId = item.comment.target_id;
      counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
    });
    return { counts, isExact: (query.data?.total ?? 0) <= INVESTIGATION_LIMITS.maxPerPage };
  }, [query.data]);
};

/** Comments of one evidence item, oldest first. */
export const useItemComments = (recordId: string, itemId: string) => {
  const query = useItems(recordId, {
    kind: ['comment'],
    target_id: itemId,
    per_page: INVESTIGATION_LIMITS.maxPerPage,
    sort_field: 'created_at',
    sort_order: 'asc',
  });
  const comments = useMemo<CommentItem[]>(
    () => (query.data?.items ?? []).filter((item): item is CommentItem => item.kind === 'comment'),
    [query.data]
  );
  return {
    comments,
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useCurrentUsername = (): string | undefined => {
  const { security } = useInvestigationsServices();
  const [username, setUsername] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    security.authc
      .getCurrentUser()
      .then((user) => {
        if (isMounted) setUsername(user.username);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [security]);

  return username;
};

export const useSavedObjectChoices = (type: 'search' | 'lens') => {
  const { http } = useInvestigationsServices();
  return useQuery(
    ['investigations', 'saved_object_choices', type],
    () => findSavedObjectChoices(http, type),
    { retry: false, staleTime: 30 * 1000 }
  );
};

export const useAlertSearch = (text: string) => {
  const { http } = useInvestigationsServices();
  return useQuery(['investigations', 'alert_search', text], () => searchAlerts(http, text), {
    retry: false,
    keepPreviousData: true,
    staleTime: 15 * 1000,
  });
};

/** The exported text for the current filters; refetched when the format or filters change. */
export const useEvidenceExport = (recordId: string, request: ExportItemsRequest) => {
  const { http } = useInvestigationsServices();
  return useQuery<EvidenceExport>(
    ['investigations', 'record', recordId, 'export', request],
    () => exportEvidenceFile(http, recordId, request),
    { retry: false, keepPreviousData: true, cacheTime: 0 }
  );
};
