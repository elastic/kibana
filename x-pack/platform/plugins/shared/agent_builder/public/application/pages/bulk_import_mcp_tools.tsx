/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BulkImportMcpTools } from '../components/tools/bulk_import/bulk_import_mcp_tools';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderBulkImportMcpToolsPage = () => {
  useBreadcrumb([
    {
      text: labels.tools.title,
      path: appPaths.tools.list,
    },
    {
      text: labels.tools.bulkImportMcp.title,
      path: appPaths.tools.bulkImportMcp,
    },
  ]);
  return <BulkImportMcpTools />;
};
