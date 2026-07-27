/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  SlackAppBindChannelResponse,
  SlackAppBindingsResponse,
  SlackAppUnbindChannelResponse,
  SlackChannelBinding,
} from '@kbn/significant-events-plugin/common';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../../../util/errors';

const BINDINGS_ROUTE = '/internal/significant_events/apps/slack/bindings';
const BIND_CHANNEL_ROUTE = (channelId: string) =>
  `/internal/significant_events/apps/slack/bindings/${channelId}/bind`;
const UNBIND_CHANNEL_ROUTE = (channelId: string) =>
  `/internal/significant_events/apps/slack/bindings/${channelId}/unbind`;

export const RELAY_APP_BINDINGS_QUERY_KEY = ['relayAppConnectionBindings'] as const;

/** Number of connected channels shown per page in the settings table. */
export const RELAY_APP_BINDINGS_PAGE_SIZE = 10;

/** Stable reference for the loading/empty state so the table `items` prop stays referentially equal. */
const EMPTY_BINDINGS: SlackChannelBinding[] = [];

export interface UseRelayAppBindings {
  bindings: SlackChannelBinding[];
  isLoading: boolean;
  isFetching: boolean;
  /** Opaque cursor for the next page; absent when this is the last page. */
  nextCursor?: string;
}

/**
 * Fetches a single page of the Slack channels connected to this deployment. The query is
 * only active when `enabled` is true (e.g. once the Slack App is connected). Pass the
 * opaque `cursor` from a previous page's `nextCursor` to fetch the next page; omit it for
 * the first page. Each cursor is cached as its own query so paging back and forth is instant.
 */
export function useRelayAppBindings(enabled: boolean, cursor?: string): UseRelayAppBindings {
  const {
    core: { http, notifications },
  } = useKibana();

  const query = useQuery<SlackAppBindingsResponse, Error>({
    queryKey: [...RELAY_APP_BINDINGS_QUERY_KEY, cursor ?? null],
    queryFn: ({ signal }) =>
      http.get<SlackAppBindingsResponse>(BINDINGS_ROUTE, {
        query: { perPage: RELAY_APP_BINDINGS_PAGE_SIZE, ...(cursor ? { cursor } : {}) },
        signal,
      }),
    enabled,
    retry: false,
    keepPreviousData: true,
    onError: (error) => {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.listBindingsError',
          { defaultMessage: 'Failed to load connected Slack channels' }
        ),
      });
    },
    // Connected channels only change via bind/unbind in this UI (which invalidate this
    // query), so cached pages stay fresh and paging back to one avoids a redundant fetch.
    staleTime: 30_000,
  });

  return {
    bindings: query.data?.bindings ?? EMPTY_BINDINGS,
    isLoading: query.isLoading && enabled,
    isFetching: query.isFetching && enabled,
    nextCursor: query.data?.nextCursor,
  };
}

export interface UseBindChannel {
  bind: (channelId: string) => Promise<void>;
  isLoading: boolean;
}

/** Mutation hook for binding a channel to this deployment. */
export function useBindChannel(): UseBindChannel {
  const {
    core: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<SlackAppBindChannelResponse, Error, string>({
    mutationFn: (channelId: string) =>
      http.post<SlackAppBindChannelResponse>(BIND_CHANNEL_ROUTE(channelId)),
    onError: (error) => {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.bindChannelError',
          { defaultMessage: 'Failed to bind the Slack channel' }
        ),
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: RELAY_APP_BINDINGS_QUERY_KEY }),
  });

  return {
    bind: (channelId: string) => mutation.mutateAsync(channelId).then(() => undefined),
    isLoading: mutation.isLoading,
  };
}

export interface UseUnbindChannel {
  unbind: (channelId: string) => Promise<void>;
  isLoading: boolean;
}

/** Per-row mutation hook for releasing a channel binding from this deployment. */
export function useUnbindChannel(): UseUnbindChannel {
  const {
    core: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<SlackAppUnbindChannelResponse, Error, string>({
    mutationFn: (channelId: string) =>
      http.post<SlackAppUnbindChannelResponse>(UNBIND_CHANNEL_ROUTE(channelId)),
    onError: (error) => {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.unbindChannelError',
          { defaultMessage: 'Failed to unbind the Slack channel' }
        ),
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: RELAY_APP_BINDINGS_QUERY_KEY }),
  });

  return {
    unbind: (channelId: string) => mutation.mutateAsync(channelId).then(() => undefined),
    isLoading: mutation.isLoading,
  };
}
