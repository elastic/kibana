/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';
import { History } from 'history';

export const HistoryContext = createContext<History | undefined>(undefined);

export const useHistory = () => {
  return useContext(HistoryContext);
};
