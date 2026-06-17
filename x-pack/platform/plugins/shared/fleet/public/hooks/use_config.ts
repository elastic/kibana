/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

import type { FleetConfigType } from '../plugin';

import { useStartServices } from '.';

export const ConfigContext = React.createContext<FleetConfigType | null>(null);

export function useConfig(): FleetConfigType {
  const { fleet } = useStartServices();
  const baseConfig = useContext(ConfigContext);

  // Downstream plugins may set `fleet` as part of the Kibana context
  // which means that the Fleet config is exposed in that way
  const pluginConfig = fleet?.config;
  const config = baseConfig || pluginConfig || null;

  if (baseConfig === null && pluginConfig) {
    // eslint-disable-next-line no-console
    console.warn('Fleet ConfigContext not initialized, using from plugin context');
  }

  if (!config) {
    throw new Error('Fleet ConfigContext not initialized');
  }

  return config;
}
