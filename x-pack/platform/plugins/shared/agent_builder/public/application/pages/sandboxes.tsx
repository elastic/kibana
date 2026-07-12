/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AgentBuilderSandboxes } from '../components/sandboxes/sandboxes_management';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';

export const AgentBuilderSandboxesPage: React.FC = () => {
  useBreadcrumb([
    {
      text: i18n.translate('xpack.agentBuilder.sandboxes.breadcrumb', {
        defaultMessage: 'Sandboxes',
      }),
      path: appPaths.manage.sandboxes,
    },
  ]);
  return <AgentBuilderSandboxes />;
};
