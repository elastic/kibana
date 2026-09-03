/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

export interface TabHrefOverrides {
  v1Href?: string;
  v2Href?: string;
}

const TabHrefOverridesContext = createContext<TabHrefOverrides>({});

export const TabHrefOverridesProvider = TabHrefOverridesContext.Provider;

export const useTabHrefOverrides = (): TabHrefOverrides => useContext(TabHrefOverridesContext);
