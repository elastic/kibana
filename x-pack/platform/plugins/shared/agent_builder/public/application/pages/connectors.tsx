/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AgentBuilderConnectors } from '../components/connectors/connectors';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';
import { ConnectorsProvider } from '../context/connectors_provider';

export const AgentBuilderConnectorsPage: React.FC = () => {
  useBreadcrumb([{ text: labels.connectors.title, path: appPaths.connectors.list }]);
  return (
    <ConnectorsProvider>
      <AgentBuilderConnectors />
    </ConnectorsProvider>
  );
};
