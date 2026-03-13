/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { PluginDetails } from '../components/plugins/plugin_details';
import { usePlugin } from '../hooks/plugins/use_plugin';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useNavigation } from '../hooks/use_navigation';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderPluginDetailsPage = () => {
  const { pluginId } = useParams<{ pluginId: string }>();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { plugin, isLoading } = usePlugin({ pluginId });

  useBreadcrumb([
    {
      text: labels.plugins.title,
      path: appPaths.plugins.list,
    },
    {
      text: plugin?.name ?? pluginId ?? '',
      path: appPaths.plugins.details({ pluginId: pluginId ?? '' }),
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

  if (!plugin) {
    navigateToAgentBuilderUrl(appPaths.plugins.list);
    return null;
  }

  return <PluginDetails plugin={plugin} />;
};
