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

const BINDINGS_ROUTE = '/internal/significant_events/apps/slack/bindings';
const BIND_CHANNEL_ROUTE = (channelId: string) =>
  `/internal/significant_events/apps/slack/bindings/${channelId}/bind`;
const UNBIND_CHANNEL_ROUTE = (channelId: string) =>
  `/internal/significant_events/apps/slack/bindings/${channelId}/unbind`;

export const RELAY_APP_BINDINGS_QUERY_KEY = ['relayAppConnectionBindings'] as const;

export interface UseRelayAppBindings {
  bindings: SlackChannelBinding[];
  isLoading: boolean;
}

/**
 * Fetches the bound Slack channels for the connected workspace.
 * The query is only active when `enabled` is true, so the fetch is deferred
 * until the expander is opened.
 */
export function useRelayAppBindings(enabled: boolean): UseRelayAppBindings {
  const {
    core: { http },
  } = useKibana();

  const query = useQuery<SlackAppBindingsResponse, Error>({
    queryKey: RELAY_APP_BINDINGS_QUERY_KEY,
    queryFn: ({ signal }) => http.get<SlackAppBindingsResponse>(BINDINGS_ROUTE, { signal }),
    enabled,
    retry: false,
  });

  return {
    bindings: (query.data?.bindings ?? []).filter((b) => !b.isDefault),
    isLoading: query.isLoading && enabled,
  };
}

export interface UseBindChannel {
  bind: (channelId: string) => Promise<void>;
  isLoading: boolean;
}

/** Per-row mutation hook for binding a channel to this deployment. */
export function useBindChannel(): UseBindChannel {
  const {
    core: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<SlackAppBindChannelResponse, Error, string>({
    mutationFn: (channelId: string) =>
      http.post<SlackAppBindChannelResponse>(BIND_CHANNEL_ROUTE(channelId)),
    onError: (error) => {
      notifications.toasts.addError(error, {
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
      notifications.toasts.addError(error, {
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
