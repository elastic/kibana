/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

interface DashboardCapabilitiesValue {
  canWriteDashboards: boolean;
}

const DashboardCapabilitiesContext = createContext<DashboardCapabilitiesValue>({
  canWriteDashboards: true,
});

export const DashboardCapabilitiesProvider = DashboardCapabilitiesContext.Provider;

export const useDashboardCapabilities = (): DashboardCapabilitiesValue =>
  useContext(DashboardCapabilitiesContext);
