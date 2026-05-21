/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AgentBuilderMcpClients } from '../components/mcp_clients/mcp_clients';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderMcpClientsPage = () => {
  useBreadcrumb([
    {
      text: labels.tools.libraryTitle,
      path: appPaths.tools.list,
    },
    {
      text: labels.tools.mcpClients.breadcrumb,
      path: appPaths.manage.mcpClients,
    },
  ]);
  return <AgentBuilderMcpClients />;
};
