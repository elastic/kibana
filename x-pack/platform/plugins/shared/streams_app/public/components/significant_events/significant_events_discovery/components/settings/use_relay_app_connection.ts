/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import {
  RELAY_APP_CONNECTION_STATUS,
  type SlackAppConnectResponse,
  type RelayAppConnectionStatus,
  type SlackAppDisconnectResponse,
  type SlackAppStatusResponse,
} from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';

const STATUS_ROUTE = '/internal/streams/_significant_events/apps/slack/status';
const CONNECT_ROUTE = '/internal/streams/_significant_events/apps/slack/connect';
const DISCONNECT_ROUTE = '/internal/streams/_significant_events/apps/slack/disconnect';
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 2 * 60 * 1_000;

export const RELAY_APP_CONNECTION_STATUS_QUERY_KEY = ['relayAppConnectionStatus'] as const;

export interface UseRelayAppConnection {
  isLoading: boolean;
  available: boolean;
  status: RelayAppConnectionStatus;
  error?: string;
  isMutating: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useRelayAppConnection(): UseRelayAppConnection {
  const {
    core: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  // Deadline until which we keep polling status while an install is in progress.
  // Reset to 0 (no polling) on disconnect, and pushed forward on connect.
  const pollDeadlineRef = useRef(0);

  const statusQuery = useQuery<SlackAppStatusResponse, Error>({
    queryKey: RELAY_APP_CONNECTION_STATUS_QUERY_KEY,
    queryFn: ({ signal }) => http.get<SlackAppStatusResponse>(STATUS_ROUTE, { signal }),
    // Status is best-effort; surface nothing on transient errors.
    retry: false,
    refetchInterval: (data) => {
      const stillInProgress = data?.status === RELAY_APP_CONNECTION_STATUS.oauthInProgress;
      if (stillInProgress && !pollDeadlineRef.current) {
        pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
      }
      return stillInProgress && Date.now() < pollDeadlineRef.current ? POLL_INTERVAL_MS : false;
    },
  });

  const connectMutation = useMutation<SlackAppConnectResponse, Error, Window | null>({
    mutationFn: () => http.post<SlackAppConnectResponse>(CONNECT_ROUTE),
    onSuccess: (response, authWindow) => {
      // Navigate the tab opened synchronously on click (see `connect` below).
      // Opening it here instead — after the request resolves — gets blocked by
      // most browsers' popup blockers, since it's no longer within the click's
      // user-activation window (Safari in particular blocks window.open() after
      // almost any async gap).
      if (authWindow && !authWindow.closed) {
        authWindow.location.href = response.authorizeUrl;
      } else if (!window.open(response.authorizeUrl, '_blank')) {
        // The synchronous open was itself blocked, or the user closed that tab
        // before the request resolved. Nothing more script can do here; let the
        // user know why no tab appeared.
        notifications.toasts.addWarning({
          title: i18n.translate(
            'xpack.streams.significantEventsDiscovery.settings.apps.connectPopupBlocked',
            { defaultMessage: 'Allow pop-ups for Kibana and try connecting again' }
          ),
        });
      }
      pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    },
    onError: (error, authWindow) => {
      authWindow?.close();
      notifications.toasts.addError(error, {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.connectError',
          {
            defaultMessage: 'Failed to start the Slack connection',
          }
        ),
      });
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: RELAY_APP_CONNECTION_STATUS_QUERY_KEY });
    },
  });

  const disconnectMutation = useMutation<SlackAppDisconnectResponse, Error>({
    mutationFn: () => {
      pollDeadlineRef.current = 0;
      return http.post<SlackAppDisconnectResponse>(DISCONNECT_ROUTE);
    },
    onError: (error) => {
      notifications.toasts.addError(error, {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.disconnectError',
          { defaultMessage: 'Failed to disconnect the Slack app' }
        ),
      });
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: RELAY_APP_CONNECTION_STATUS_QUERY_KEY });
    },
  });

  return {
    isLoading: statusQuery.isLoading,
    available: statusQuery.data?.available ?? false,
    status: statusQuery.data?.status ?? RELAY_APP_CONNECTION_STATUS.notConnected,
    error: statusQuery.data?.error,
    isMutating: connectMutation.isLoading || disconnectMutation.isLoading,
    connect: async () => {
      // Must happen synchronously, inside the click's user-activation window —
      // see the comment in connectMutation.onSuccess above.
      const authWindow = window.open('', '_blank');
      await connectMutation.mutateAsync(authWindow);
    },
    disconnect: async () => {
      await disconnectMutation.mutateAsync();
    },
  };
}
