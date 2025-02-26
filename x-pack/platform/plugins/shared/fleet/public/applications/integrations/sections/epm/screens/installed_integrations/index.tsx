/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { InstalledIntegrationsTable } from './components/installed_integrations_table';
import { useInstalledIntegrations } from './hooks/use_installed_integrations';

export const InstalledIntegrationsPage: React.FunctionComponent = () => {
  // State management
  const { installedPackages, isLoading } = useInstalledIntegrations();

  // Todo loading/error state

  return (
    <>
      <div>TODO search bar</div>
      <InstalledIntegrationsTable isLoading={isLoading} installedPackages={installedPackages} />
    </>
  );
};
