/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { InboxItem } from '../../../common/types/api/inbox/v1';
import { useCasesToast } from '../../common/use_cases_toast';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import type { ServerError } from '../../types';
import { casesQueriesKeys } from '../constants';
import { ERROR_TITLE } from '../translations';
import { findInbox } from './api';

const INBOX_REFETCH_INTERVAL_MS = 60_000;

/** Items newer than the cursor are unread; it is stored in the user profile. */
const useInboxLastReadAt = () => {
  const { userProfile } = useKibana().services;

  return useQuery(
    casesQueriesKeys.inboxRead(),
    async () => {
      const profile = await userProfile.getCurrent({ dataPath: 'userSettings' });
      return profile.data?.userSettings?.casesInboxLastReadAt ?? null;
    },
    { staleTime: Infinity }
  );
};

const useSaveInboxLastReadAt = () => {
  const { userProfile } = useKibana().services;
  const queryClient = useQueryClient();
  const { showErrorToast } = useCasesToast();

  return useMutation(
    (lastReadAt: string) =>
      userProfile.partialUpdate({ userSettings: { casesInboxLastReadAt: lastReadAt } }),
    {
      onMutate: (lastReadAt) => {
        const previous = queryClient.getQueryData<string | null>(casesQueriesKeys.inboxRead());
        queryClient.setQueryData(casesQueriesKeys.inboxRead(), lastReadAt);
        return { previous };
      },
      onError: (error: ServerError, _, context) => {
        queryClient.setQueryData(casesQueriesKeys.inboxRead(), context?.previous ?? null);
        showErrorToast(error, { title: ERROR_TITLE });
      },
    }
  );
};

const isAfter = (date: string, cursor: string | null): boolean =>
  cursor == null || Date.parse(date) > Date.parse(cursor);

/** The inbox of the current user, with a read cursor. */
export const useInbox = () => {
  const { data: lastReadAt = null, isFetched } = useInboxLastReadAt();
  const { mutate: saveLastReadAt } = useSaveInboxLastReadAt();
  const { owner } = useCasesContext();
  const { data, isLoading } = useQuery(
    casesQueriesKeys.inbox(owner),
    ({ signal }) => findInbox(owner, signal),
    {
      keepPreviousData: true,
      refetchInterval: INBOX_REFETCH_INTERVAL_MS,
    }
  );

  const items = useMemo(() => data?.items ?? [], [data]);
  const isUnread = useCallback(
    ({ createdAt }: InboxItem) => isFetched && isAfter(createdAt, lastReadAt),
    [isFetched, lastReadAt]
  );
  const unreadCount = items.filter(isUnread).length;

  // Uses the newest item time, not the browser clock, so items not yet fetched stay unread.
  const markAllRead = useCallback(() => {
    const newest = items.reduce<string | null>(
      (latest, { createdAt }) => (isAfter(createdAt, latest) ? createdAt : latest),
      null
    );
    if (newest != null && isAfter(newest, lastReadAt)) {
      saveLastReadAt(newest);
    }
  }, [items, lastReadAt, saveLastReadAt]);

  return { items, unreadCount, isLoading, isUnread, markAllRead };
};
