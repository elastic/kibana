/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { TimeRange } from '@kbn/es-query';

/**
 * Catalog components receive only their resolved A2UI props, which is right for
 * pure UI but leaves Kibana-backed components (charts) with no way to reach
 * services or the page time range. This context is that channel — deliberately
 * narrow, so the surface a generated document can touch stays small.
 */
export interface CustomAppServices {
  timeRange: TimeRange;
}

const CustomAppServicesContext = createContext<CustomAppServices | undefined>(undefined);

export function CustomAppServicesProvider({
  services,
  children,
}: {
  services: CustomAppServices;
  children: React.ReactNode;
}) {
  return (
    <CustomAppServicesContext.Provider value={services}>
      {children}
    </CustomAppServicesContext.Provider>
  );
}

export function useCustomAppServices(): CustomAppServices | undefined {
  return useContext(CustomAppServicesContext);
}
