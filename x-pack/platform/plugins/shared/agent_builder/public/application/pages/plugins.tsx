/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AgentBuilderPlugins } from '../components/plugins/plugins';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderPluginsPage = () => {
  useBreadcrumb([{ text: labels.plugins.libraryTitle, path: appPaths.plugins.list }]);
  return <AgentBuilderPlugins />;
};
