/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AgentBuilderMemorySearchPanel } from '../components/memory/memory_search_panel';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';

const breadcrumbMemory = i18n.translate('xpack.agentBuilder.memory.search.breadcrumb.memory', {
  defaultMessage: 'Memory',
});

const breadcrumbSearch = i18n.translate('xpack.agentBuilder.memory.search.breadcrumb.search', {
  defaultMessage: 'Search',
});

export const AgentBuilderMemorySearchPage: React.FC = () => {
  useBreadcrumb([
    { text: breadcrumbMemory, path: appPaths.manage.memory },
    { text: breadcrumbSearch, path: appPaths.manage.memorySearch },
  ]);
  return <AgentBuilderMemorySearchPanel />;
};
