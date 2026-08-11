/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';

export interface SlackChannel {
  id: string;
  name: string;
}

interface ExecuteResponse {
  status: string;
  message?: string;
  service_message?: string;
  data: {
    ok: boolean;
    channels: SlackChannel[];
  };
}

const connectorExecutePath = (id: string) =>
  `/api/actions/connector/${encodeURIComponent(id)}/_execute`;

/**
 * Loads the channels a Slack-style connector can post to by executing its channel-listing
 * sub-action. Shared by the Slack (v2) and Slack (Elastic app) selectors, which expose the
 * same `{ id, name }` channel shape under different sub-action names.
 */
export const useFetchSlackChannels = ({
  connectorId,
  subAction = 'listChannels',
  enabled = true,
}: {
  connectorId: string | null;
  /** Sub-action that returns `{ ok, channels }`. */
  subAction?: string;
  enabled?: boolean;
}) => {
  const http = useService(CoreStart('http'));
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<SlackChannel[], Error>({
    queryKey: ['alertingV2', 'slackChannels', connectorId, subAction],
    queryFn: async () => {
      const res = await http.post<ExecuteResponse>(connectorExecutePath(connectorId!), {
        body: JSON.stringify({
          params: { subAction, subActionParams: {} },
        }),
      });

      if (res.status !== 'ok' || !res.data?.ok) {
        throw new Error(
          [res.message, res.service_message].filter(Boolean).join(': ') ||
            'Failed to fetch Slack channels'
        );
      }

      return res.data.channels;
    },
    enabled: enabled && connectorId !== null,
    refetchOnWindowFocus: false,
    retry: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.responseOps.alertingV2RuleForm.actionForm.slackChannels.fetchError',
          { defaultMessage: 'Failed to load Slack channels' }
        ),
      });
    },
  });
};
