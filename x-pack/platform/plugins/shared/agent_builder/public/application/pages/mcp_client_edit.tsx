/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { McpClientEdit } from '../components/mcp_clients/form/mcp_client_edit';
import { useOAuthClient } from '../hooks/oauth_clients/use_oauth_client';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useToasts } from '../hooks/use_toasts';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderMcpClientEditPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { client, error, isError } = useOAuthClient(clientId);
  const { addErrorToast } = useToasts();

  useBreadcrumb([
    {
      text: labels.tools.libraryTitle,
      path: appPaths.tools.list,
    },
    {
      text: labels.tools.mcpClients.breadcrumb,
      path: appPaths.manage.mcpClients,
    },
    {
      text: client?.client_name || labels.tools.mcpClients.form.editBreadcrumb,
      path: appPaths.manage.mcpClientEdit({ clientId }),
    },
  ]);

  useEffect(() => {
    if (!isError) {
      return;
    }
    addErrorToast({
      title: labels.tools.mcpClients.loadMcpClientErrorMessage,
      text: formatAgentBuilderErrorMessage(error),
    });
  }, [isError, error, addErrorToast]);

  return <McpClientEdit />;
};
