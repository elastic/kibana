/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  SLACK_APP_CONNECTION_STATUS,
  type SlackAppConnectResponse,
  type SlackAppConnectionStatus,
  type SlackAppDisconnectResponse,
  type SlackAppStatusResponse,
} from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';

const STATUS_ROUTE = '/internal/streams/_significant_events/apps/slack/status';
const CONNECT_ROUTE = '/internal/streams/_significant_events/apps/slack/connect';
const DISCONNECT_ROUTE = '/internal/streams/_significant_events/apps/slack/disconnect';
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 2 * 60 * 1_000;

export interface UseSlackAppConnection {
  isLoading: boolean;
  available: boolean;
  status: SlackAppConnectionStatus;
  error?: string;
  isMutating: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useSlackAppConnection(): UseSlackAppConnection {
  const {
    core: { http, notifications },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [state, setState] = useState<SlackAppStatusResponse>({
    available: false,
    status: SLACK_APP_CONNECTION_STATUS.notConnected,
  });

  const isMounted = useRef(true);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearPoll = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = undefined;
    }
  }, []);

  const fetchStatus = useCallback(async (): Promise<SlackAppStatusResponse | undefined> => {
    try {
      const response = await http.get<SlackAppStatusResponse>(STATUS_ROUTE);
      if (isMounted.current) {
        setState(response);
      }
      return response;
    } catch (error) {
      // Status is best-effort; surface nothing on transient errors.
      return undefined;
    }
  }, [http]);

  useEffect(() => {
    isMounted.current = true;
    void fetchStatus().finally(() => {
      if (isMounted.current) {
        setIsLoading(false);
      }
    });
    return () => {
      isMounted.current = false;
      clearPoll();
    };
  }, [fetchStatus, clearPoll]);

  // Poll status while an install is in progress until it resolves or times out.
  const pollUntilResolved = useCallback(
    (deadline: number) => {
      clearPoll();
      pollTimer.current = setTimeout(async () => {
        const response = await fetchStatus();
        if (!isMounted.current) {
          return;
        }
        const stillInProgress =
          !response || response.status === SLACK_APP_CONNECTION_STATUS.oauthInProgress;
        if (stillInProgress && Date.now() < deadline) {
          pollUntilResolved(deadline);
        }
      }, POLL_INTERVAL_MS);
    },
    [fetchStatus, clearPoll]
  );

  const connect = useCallback(async () => {
    setIsMutating(true);
    try {
      const response = await http.post<SlackAppConnectResponse>(CONNECT_ROUTE);
      // The Slack OAuth consent happens in the user's browser; open it in a new tab.
      window.open(response.authorizeUrl, '_blank', 'noopener,noreferrer');
      await fetchStatus();
      pollUntilResolved(Date.now() + POLL_TIMEOUT_MS);
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.connectError',
          {
            defaultMessage: 'Failed to start the Slack connection',
          }
        ),
      });
    } finally {
      if (isMounted.current) {
        setIsMutating(false);
      }
    }
  }, [http, notifications, fetchStatus, pollUntilResolved]);

  const disconnect = useCallback(async () => {
    setIsMutating(true);
    clearPoll();
    try {
      await http.post<SlackAppDisconnectResponse>(DISCONNECT_ROUTE);
      await fetchStatus();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.disconnectError',
          { defaultMessage: 'Failed to disconnect the Slack app' }
        ),
      });
    } finally {
      if (isMounted.current) {
        setIsMutating(false);
      }
    }
  }, [http, notifications, fetchStatus, clearPoll]);

  return {
    isLoading,
    available: state.available,
    status: state.status,
    error: state.error,
    isMutating,
    connect,
    disconnect,
  };
}
