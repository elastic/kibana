/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';

import { ApplicationConnectionsServicesContext } from '../context/application_connections_services_context';

export const useApplicationConnectionsService = () => {
  const services = useContext(ApplicationConnectionsServicesContext);
  if (services === undefined) {
    throw new Error(
      `ApplicationConnectionsServicesContext not set. Did you wrap your component in <ApplicationConnectionsServicesContext.Provider> ?`
    );
  }
  return services.apiClient;
};
