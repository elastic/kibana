/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AgentBuilderMemoryList } from '../components/memory/memory_list';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';

const breadcrumbLabel = i18n.translate('xpack.agentBuilder.memory.breadcrumb', {
  defaultMessage: 'Memory',
});

export const AgentBuilderMemoryPage: React.FC = () => {
  useBreadcrumb([{ text: breadcrumbLabel, path: appPaths.manage.memory }]);
  return <AgentBuilderMemoryList />;
};
