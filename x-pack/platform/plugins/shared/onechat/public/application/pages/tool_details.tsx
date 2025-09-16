/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { EditTool } from '../components/tools/edit_tool';
import { ViewTool } from '../components/tools/view_tool';
import { useTool } from '../hooks/tools/use_tools';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useNavigation } from '../hooks/use_navigation';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';
import { ToolsProvider } from '../context/tools_provider';

export const OnechatToolDetailsPage = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const { navigateToOnechatUrl } = useNavigation();
  const { tool, isLoading } = useTool({ toolId });

  useBreadcrumb([
    {
      text: labels.tools.title,
      path: appPaths.tools.list,
    },
    {
      text: toolId || '',
      path: appPaths.tools.details({ toolId: toolId || '' }),
    },
  ]);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!tool) {
    navigateToOnechatUrl(appPaths.tools.list);
    return;
  }

  return <ToolsProvider>{tool.readonly ? <ViewTool /> : <EditTool />}</ToolsProvider>;
};
