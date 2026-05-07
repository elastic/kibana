/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { AgentBuilderSessionDetailView } from '../components/sessions/session_detail_view';

const sessionTitle = i18n.translate('xpack.agentBuilder.session.title', {
  defaultMessage: 'Session',
});

export const AgentBuilderSessionDetailPage: React.FC = () => {
  useBreadcrumb([{ text: sessionTitle, path: '/' }]);
  return <AgentBuilderSessionDetailView />;
};
