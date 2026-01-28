/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsConfigurationUtilities } from '../actions_config';

export const getBeforeRedirectFn = (configurationUtilities: ActionsConfigurationUtilities) => {
  return (options: Record<string, unknown>) => {
    const hostname = options.hostname;
    if (hostname == null) {
      throw new Error('redirect hostname not provided by axios');
    }

    if (typeof hostname !== 'string') {
      throw new Error('redirect hostname provided by axios was not a string');
    }

    configurationUtilities.ensureHostnameAllowed(hostname);
  };
};
