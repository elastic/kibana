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

export interface UseSlackAppBindings {
  bindings: SlackChannelBinding[];
  isLoading: boolean;
  isMutating: boolean;
  bindChannel: (channelId: string) => Promise<void>;
  unbindChannel: (channelId: string) => Promise<void>;
}

const queryKey = ['relayAppConnectionBindings'] as const;

/**
 * Fetches the bound Slack channels for the connected workspace and
 * provides bind/unbind mutations for channel-level management.
 * The query is only active when `enabled` is true, so the fetch is deferred
 * until the expander is opened.
 */
export function useSlackAppBindings(enabled: boolean): UseSlackAppBindings {
  const {
    core: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const query = useQuery<SlackAppBindingsResponse, Error>({
    queryKey,
    queryFn: ({ signal }) => http.get<SlackAppBindingsResponse>(BINDINGS_ROUTE, { signal }),
    enabled,
    retry: false,
  });

  const bindMutation = useMutation<SlackAppBindChannelResponse, Error, string>({
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
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const unbindMutation = useMutation<SlackAppUnbindChannelResponse, Error, string>({
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
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    bindings: query.data?.bindings ?? [],
    isLoading: query.isLoading && enabled,
    isMutating: bindMutation.isLoading || unbindMutation.isLoading,
    bindChannel: (channelId: string) => bindMutation.mutateAsync(channelId).then(() => undefined),
    unbindChannel: (channelId: string) =>
      unbindMutation.mutateAsync(channelId).then(() => undefined),
  };
}
