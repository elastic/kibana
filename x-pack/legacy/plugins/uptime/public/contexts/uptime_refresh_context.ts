/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext } from 'react';
import { History } from 'history';

interface Location {
  pathname: string;
  search: string;
}

interface UMRefreshContext {
  lastRefresh: number;
  history: History | undefined;
  location: Location | undefined;
}

const defaultContext: UMRefreshContext = {
  lastRefresh: 0,
  history: undefined,
  location: undefined,
};

export const UptimeRefreshContext = createContext(defaultContext);
