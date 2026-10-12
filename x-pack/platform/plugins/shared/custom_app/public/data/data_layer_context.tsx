/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { DataLayer } from './data_layer';

export const DataLayerContext = createContext<DataLayer | undefined>(undefined);

export const useDataLayer = (): DataLayer => {
  const layer = useContext(DataLayerContext);
  if (!layer) throw new Error('useDataLayer must be used inside a DataLayerContext provider');
  return layer;
};
