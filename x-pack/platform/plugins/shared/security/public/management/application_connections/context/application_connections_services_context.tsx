/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';

import type { ApplicationConnectionsAPIClient } from '../service/application_connections_api_client';

export interface ApplicationConnectionsServices {
  apiClient: ApplicationConnectionsAPIClient;
}

export const ApplicationConnectionsServicesContext = createContext<
  ApplicationConnectionsServices | undefined
>(undefined);
