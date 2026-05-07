/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { AgentBuilderSessionsView } from '../components/sessions/sessions_view';

const sessionsTitle = i18n.translate('xpack.agentBuilder.sessions.title', {
  defaultMessage: 'Bots',
});

export const AgentBuilderSessionsPage: React.FC = () => {
  useBreadcrumb([{ text: sessionsTitle, path: appPaths.root }]);
  return <AgentBuilderSessionsView />;
};
