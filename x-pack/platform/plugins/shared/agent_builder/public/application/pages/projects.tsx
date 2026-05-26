/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AgentBuilderProjects } from '../components/projects/projects';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';

export const AgentBuilderProjectsPage = () => {
  useBreadcrumb([
    {
      text: i18n.translate('xpack.agentBuilder.projects.breadcrumb', {
        defaultMessage: 'Projects',
      }),
      path: appPaths.manage.projects,
    },
  ]);

  return <AgentBuilderProjects />;
};
