/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import type { CoreStart } from '@kbn/core/public';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { useKibana } from '@kbn/kibana-react-plugin/public';

const MCP_CLIENTS_LIST_PATH = '/manage/tools/mcp_clients';
const MCP_CLIENT_CREATE_PATH = '/manage/tools/mcp_clients/new';

export const useNavigation = () => {
  const {
    services: { application },
  } = useKibana<CoreStart>();

  const createAgentBuilderUrl = useCallback(
    (path: string, params?: Record<string, string>) => {
      const queryParams = new URLSearchParams(params);
      return application.getUrlForApp(AGENT_BUILDER_APP_ID, {
        path: queryParams.size ? `${path}?${queryParams}` : path,
      });
    },
    [application]
  );

  const navigateToAgentBuilderUrl = useCallback(
    (path: string, params?: Record<string, string>) => {
      const queryParams = new URLSearchParams(params);
      application.navigateToApp(AGENT_BUILDER_APP_ID, {
        path: queryParams.size ? `${path}?${queryParams}` : path,
      });
    },
    [application]
  );

  const mcpClientsListUrl = useMemo(
    () => application.getUrlForApp(AGENT_BUILDER_APP_ID, { path: MCP_CLIENTS_LIST_PATH }),
    [application]
  );

  const mcpClientCreateUrl = useMemo(
    () => application.getUrlForApp(AGENT_BUILDER_APP_ID, { path: MCP_CLIENT_CREATE_PATH }),
    [application]
  );

  return {
    createAgentBuilderUrl,
    navigateToAgentBuilderUrl,
    mcpClientsListUrl,
    mcpClientCreateUrl,
  };
};
