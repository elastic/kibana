/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EditSkill } from '../components/skills/edit_skill';
import { usePluginsService } from '../hooks/plugins/use_plugins';
import { useSkill } from '../hooks/skills/use_skills';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useNavigation } from '../hooks/use_navigation';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderSkillDetailsPage = () => {
  const { skillId } = useParams<{ skillId: string }>();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { skill, isLoading } = useSkill({ skillId });
  const { plugins, isLoading: isLoadingPlugins } = usePluginsService();

  const parentPlugin = useMemo(() => {
    const pluginId = skill?.plugin_id;
    if (!pluginId) {
      return undefined;
    }
    return plugins.find((p) => p.id === pluginId);
  }, [skill?.plugin_id, plugins]);

  const breadcrumbs = useMemo(() => {
    if (isLoading || isLoadingPlugins) {
      return [];
    }
    if (parentPlugin) {
      return [
        {
          text: labels.plugins.title,
          path: appPaths.plugins.list,
        },
        {
          text: parentPlugin.name,
          path: appPaths.plugins.details({ pluginId: parentPlugin.id }),
        },
        {
          text: labels.skills.title,
        },
        {
          text: skillId || '',
          path: appPaths.skills.details({ skillId: skillId || '' }),
        },
      ];
    }
    return [
      {
        text: labels.skills.libraryTitle,
        path: appPaths.skills.list,
      },
      {
        text: skillId || '',
        path: appPaths.skills.details({ skillId: skillId || '' }),
      },
    ];
  }, [parentPlugin, skillId, isLoading, isLoadingPlugins]);

  useBreadcrumb(breadcrumbs);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!skill) {
    navigateToAgentBuilderUrl(appPaths.skills.list);
    return null;
  }

  return <EditSkill />;
};
