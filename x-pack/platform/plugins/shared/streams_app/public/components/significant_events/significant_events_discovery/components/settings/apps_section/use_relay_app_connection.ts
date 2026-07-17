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
} from '@kbn/significant-events-plugin/common';
import { useKibana } from '../../../../../../hooks/use_kibana';

const STATUS_ROUTE = '/internal/significant_events/apps/slack/status';
const CONNECT_ROUTE = '/internal/significant_events/apps/slack/connect';
const DISCONNECT_ROUTE = '/internal/significant_events/apps/slack/disconnect';
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

  const connectMutation = useMutation<SlackAppConnectResponse, Error>({
    mutationFn: () => http.post<SlackAppConnectResponse>(CONNECT_ROUTE),
    onSuccess: () => {
      pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    },
    onError: (error) => {
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
      // Open the tab synchronously, inside the click gesture: `mutateAsync`
      // below awaits a network round-trip, and by the time it resolves the
      // click's user-activation has expired, so opening the tab from
      // `onSuccess` gets treated as an unsolicited popup and blocked by most
      // browsers. Navigate this pre-opened tab once we have the URL instead.
      const authWindow = window.open('', '_blank');
      if (authWindow) {
        // Detach the opener reference to protect against reverse tabnabbing,
        // while keeping our own handle so we can navigate the tab below.
        authWindow.opener = null;
      }

      try {
        const response = await connectMutation.mutateAsync();
        if (authWindow && !authWindow.closed) {
          authWindow.location.replace(response.authorizeUrl);
        }
      } catch (error) {
        authWindow?.close();
        throw error;
      }
    },
    disconnect: async () => {
      await disconnectMutation.mutateAsync();
    },
  };
}
