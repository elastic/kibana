/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { HttpStart, IUiSettingsClient } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';

/**
 * Catalog components receive only their resolved A2UI props, which is right for
 * pure UI but leaves Kibana-backed components with no way to reach services or
 * page-level state. This context is that channel — deliberately narrow, so the
 * surface a generated document can touch stays small.
 *
 * The time range lives here rather than in a surface's data model because it is
 * shared: one filter panel sets it and every query panel reads it.
 */
export interface CustomAppServices {
  timeRange: TimeRange;
  setTimeRange: (next: TimeRange) => void;
  search: ISearchGeneric;
  http: HttpStart;
  /** Needed by the Custom HTML renderer to resolve date and number formats. */
  uiSettings: IUiSettingsClient;
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
