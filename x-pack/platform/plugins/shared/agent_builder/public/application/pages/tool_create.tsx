/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CreateTool } from '../components/tools/create_tool';
import { ToolsProvider } from '../context/tools_provider';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderToolCreatePage = () => {
  useBreadcrumb([
    {
      text: labels.tools.title,
      path: appPaths.tools.list,
    },
    {
      text: labels.tools.newToolTitle,
      path: appPaths.tools.new,
    },
  ]);
  return (
    <ToolsProvider>
      <CreateTool />
    </ToolsProvider>
  );
};
