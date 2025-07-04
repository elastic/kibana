/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Capabilities } from '@kbn/core-capabilities-common';

export const getDefaultCapabilities = (override?: Partial<Capabilities>): Capabilities => {
  return {
    actions: {
      show: true,
      save: true,
      execute: true,
      delete: true,
    },
    catalogue: {},
    management: {},
    navLinks: {},
    fleet: {
      read: true,
      all: true,
    },
    fleetv2: {
      read: true,
      all: true,
    },
    ...override,
  };
};
