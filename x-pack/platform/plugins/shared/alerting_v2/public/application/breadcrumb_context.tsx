/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core/public';

type SetBreadcrumbs = (crumbs: ChromeBreadcrumb[]) => void;

const BreadcrumbContext = createContext<SetBreadcrumbs | undefined>(undefined);

export const BreadcrumbProvider = ({
  setBreadcrumbs,
  children,
}: {
  setBreadcrumbs: SetBreadcrumbs;
  children: React.ReactNode;
}) => {
  return <BreadcrumbContext.Provider value={setBreadcrumbs}>{children}</BreadcrumbContext.Provider>;
};

export const useSetBreadcrumbs = (): SetBreadcrumbs => {
  const setBreadcrumbs = useContext(BreadcrumbContext);
  if (!setBreadcrumbs) {
    throw new Error('useSetBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return setBreadcrumbs;
};
