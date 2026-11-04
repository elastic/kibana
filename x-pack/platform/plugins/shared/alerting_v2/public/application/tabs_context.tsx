/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { AppHeaderTab } from '@kbn/app-header';

const TabsContext = createContext<AppHeaderTab[] | undefined>(undefined);

export const TabsProvider = ({
  tabs,
  children,
}: {
  tabs?: AppHeaderTab[];
  children: React.ReactNode;
}) => <TabsContext.Provider value={tabs}>{children}</TabsContext.Provider>;

export const useHostTabs = (): AppHeaderTab[] | undefined => useContext(TabsContext);
