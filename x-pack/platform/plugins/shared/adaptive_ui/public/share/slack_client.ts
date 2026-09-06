/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { ViewSpec } from '@kbn/adaptive-ui';
import type { PostToSlackResponse } from '../../common/http_api';
import { adaptiveUiApiPaths, SLACK_CONNECTOR_TYPE_ID } from '../../common/http_api';

/** Pages walked before the channel list is truncated. */
const MAX_CHANNEL_PAGES = 10;
const CHANNELS_PER_PAGE = 200;

export interface SlackConnector {
  id: string;
  name: string;
}

export interface SlackChannel {
  id: string;
  name: string;
}

interface ConnectorApiResponse {
  id: string;
  name: string;
  connector_type_id: string;
  is_missing_secrets?: boolean;
}

interface ExecuteResponse<TData> {
  status: string;
  message?: string;
  service_message?: string;
  data?: TData;
}

const executeSubAction = async <TData>(
  http: HttpStart,
  connectorId: string,
  subAction: string,
  subActionParams: Record<string, unknown>
): Promise<TData> => {
  const result = await http.post<ExecuteResponse<TData>>(
    `/api/actions/connector/${encodeURIComponent(connectorId)}/_execute`,
    { body: JSON.stringify({ params: { subAction, subActionParams } }) }
  );

  if (result.status !== 'ok' || !result.data) {
    throw new Error(
      [result.message, result.service_message].filter(Boolean).join(': ') ||
        `The Slack connector could not run "${subAction}".`
    );
  }

  return result.data;
};

/** Slack (v2) connectors the current user can execute, secrets configured. */
export const loadSlackConnectors = async (http: HttpStart): Promise<SlackConnector[]> => {
  const connectors = await http.get<ConnectorApiResponse[]>('/api/actions/connectors');

  return connectors
    .filter(
      ({ connector_type_id: typeId, is_missing_secrets: isMissingSecrets }) =>
        typeId === SLACK_CONNECTOR_TYPE_ID && !isMissingSecrets
    )
    .map(({ id, name }) => ({ id, name }));
};

/**
 * Walks `listChannels` to a bounded page count. The connector's execute API is
 * the same seam the alerting rule form uses for its channel picker.
 */
export const loadSlackChannels = async (
  http: HttpStart,
  connectorId: string
): Promise<{ channels: SlackChannel[]; truncated: boolean }> => {
  const channels: SlackChannel[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_CHANNEL_PAGES; page++) {
    const data = await executeSubAction<{
      channels?: Array<{ id: string; name: string }>;
      nextCursor?: string;
    }>(http, connectorId, 'listChannels', {
      limit: CHANNELS_PER_PAGE,
      ...(cursor ? { cursor } : {}),
    });

    channels.push(...(data.channels ?? []).map(({ id, name }) => ({ id, name })));
    cursor = data.nextCursor;
    if (!cursor) {
      return { channels, truncated: false };
    }
  }

  return { channels, truncated: true };
};

export const postViewToSlack = async (
  http: HttpStart,
  { connectorId, channel, spec }: { connectorId: string; channel: string; spec: ViewSpec }
): Promise<PostToSlackResponse> =>
  await http.post<PostToSlackResponse>(adaptiveUiApiPaths.postToSlack, {
    body: JSON.stringify({ connectorId, channel, spec }),
  });
