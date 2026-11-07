/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/as-code-dashboard-schema';
import { buildLayoutPrompt, type LayoutRequest } from '@kbn/dashboard-agent-authoring';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import type { ApiClientFixture, KbnClient, KibanaRole, RoleApiCredentials } from '@kbn/scout';
import {
  COMMON_HEADERS,
  DASHBOARD_APP_API_VERSION,
  DASHBOARD_APP_PATH,
  DASHBOARDS_PATH,
} from './constants';

export const GENERATE_DASHBOARD_MCP_NAME = 'platform_dashboard_generate_dashboard';

export const inSpace = (path: string, spaceId?: string): string =>
  spaceId ? `s/${spaceId}/${path}` : path;

export const dashboardAuthorRole = (spaceId: string): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { agentBuilder: ['read'], actions: ['read'], dashboard_v2: ['all'] },
      spaces: [spaceId],
    },
  ],
});

export const markdownPanel = (id: string, content: string) => ({
  id,
  content: { source: 'config', type: 'markdown', config: { content } },
});

export interface DashboardToolResult {
  dashboard_id: string;
  url: string;
  dashboard: { title: string; description?: string; panels: unknown[]; controls: unknown[] };
  created: string[];
  updated: string[];
  removed: string[];
  failures?: Array<{ type: string; kind?: string; identifier: string; error: string }>;
}

export interface ToolResultEnvelope {
  results: Array<{ type: string; data: Record<string, unknown> }>;
}

export const resultOfType = <T = Record<string, unknown>>(
  envelope: ToolResultEnvelope,
  type: string
): T => {
  const result = envelope.results.find((entry) => entry.type === type);
  if (!result) {
    throw new Error(`No ${type} result in ${JSON.stringify(envelope)}`);
  }
  return result.data as T;
};

export const withMcpClient = async <T>(
  { url, headers }: { url: string; headers: Record<string, string> },
  fn: (client: Client) => Promise<T>
): Promise<T> => {
  const client = new Client({ name: 'scout-agent-builder-dashboards', version: '1.0.0' });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } })
    );
    return await fn(client);
  } finally {
    await client.close();
  }
};

export const callGenerateDashboard = async (
  client: Client,
  args: Record<string, unknown>
): Promise<ToolResultEnvelope> => {
  const { content } = (await client.callTool({
    name: GENERATE_DASHBOARD_MCP_NAME,
    arguments: args,
  })) as { content: Array<{ type: string; text: string }> };
  return JSON.parse(content[0].text);
};

export const readDashboard = (
  apiClient: ApiClientFixture,
  credentials: RoleApiCredentials,
  id: string,
  spaceId?: string
) =>
  apiClient.get(inSpace(`${DASHBOARDS_PATH}/${encodeURIComponent(id)}`, spaceId), {
    headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
    responseType: 'json',
  });

const dashboardAppHeaders = (credentials: RoleApiCredentials) => ({
  ...COMMON_HEADERS,
  'elastic-api-version': DASHBOARD_APP_API_VERSION,
  ...credentials.apiKeyHeader,
});

/** Saves a dashboard through the Dashboard app's API, which keeps panels the public API cannot express. */
export const createAppDashboard = (
  apiClient: ApiClientFixture,
  credentials: RoleApiCredentials,
  body: Record<string, unknown>
) =>
  apiClient.post(DASHBOARD_APP_PATH, {
    headers: dashboardAppHeaders(credentials),
    body,
    responseType: 'json',
  });

/** Reads a dashboard the way the Dashboard app loads it. */
export const readAppDashboard = (
  apiClient: ApiClientFixture,
  credentials: RoleApiCredentials,
  id: string
) =>
  apiClient.get(`${DASHBOARD_APP_PATH}/${encodeURIComponent(id)}`, {
    headers: dashboardAppHeaders(credentials),
    responseType: 'json',
  });

export const deleteDashboards = async (
  kbnClient: KbnClient,
  ids: Iterable<string>,
  spaceId?: string
): Promise<void> => {
  for (const id of ids) {
    await kbnClient.request({
      method: 'DELETE',
      path: `/${inSpace(`${DASHBOARDS_PATH}/${encodeURIComponent(id)}`, spaceId)}`,
      headers: COMMON_HEADERS,
      ignoreErrors: [404],
    });
  }
};

export const pinProxyConnector = async (
  kbnClient: KbnClient,
  proxy: LlmProxy,
  spaceId?: string
): Promise<string> => {
  const {
    data: { id },
  } = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: `/${inSpace('api/actions/connector', spaceId)}`,
    headers: COMMON_HEADERS,
    body: {
      name: 'agent-builder-dashboards-llm-proxy',
      connector_type_id: '.gen-ai',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxy.getPort()}`,
        defaultModel: 'gpt-4',
      },
      secrets: { apiKey: 'myApiKey' },
    },
  });
  await kbnClient.uiSettings.update(
    { [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: id },
    { space: spaceId }
  );
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
  return id;
};

const { system: LAYOUT_SYSTEM_PROMPT } = buildLayoutPrompt({ panels: [], sections: [] });
const PANEL_HEIGHT = 6;

type ProxiedMessage = Parameters<
  NonNullable<Parameters<LlmProxy['interceptors']['userMessage']>[0]['when']>
>[0]['messages'][number];

const textOf = ({ content }: ProxiedMessage): string =>
  typeof content === 'string'
    ? content
    : (content ?? []).map((part) => ('text' in part ? part.text : '')).join('');

const stackPanels = ({ panels }: LayoutRequest): string =>
  JSON.stringify({
    plan: '',
    panels: panels.map(({ id }, row) => [
      id,
      0,
      row * PANEL_HEIGHT,
      DASHBOARD_GRID_COLUMN_COUNT,
      PANEL_HEIGHT,
    ]),
    sections: [],
  });

const LAYOUT_INTERCEPTOR_NAME = 'dashboard layout';

const isUnusedInterceptorTimeout = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.startsWith(`Interceptor "${LAYOUT_INTERCEPTOR_NAME}" timed out`);

export const answerNextLayoutCall = (proxy: LlmProxy): void => {
  proxy.interceptors
    .userMessage({
      name: LAYOUT_INTERCEPTOR_NAME,
      when: ({ messages }) =>
        messages.some(
          (message) => message.role === 'system' && textOf(message).includes(LAYOUT_SYSTEM_PROMPT)
        ),
      response: ({ messages }) => {
        const userText = textOf(messages[messages.length - 1]);
        return stackPanels(JSON.parse(userText.slice(userText.indexOf('{'))));
      },
    })
    .catch((error: unknown) => {
      if (!isUnusedInterceptorTimeout(error)) {
        throw error;
      }
    });
};
