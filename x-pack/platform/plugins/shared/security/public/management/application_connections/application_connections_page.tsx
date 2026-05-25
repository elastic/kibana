/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ApplicationConnections } from './application_connections_table/application_connections';
import { ApplicationConnectionsProvider } from './context/application_connections_provider';

export const ApplicationConnectionsPage = () => {
  return (
    <ApplicationConnectionsProvider>
      <ApplicationConnections />
    </ApplicationConnectionsProvider>
  );
};
