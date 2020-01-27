/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';

export interface CoreSetup {
  server: Legacy.Server;
}

export function createShim(server: Legacy.Server): { coreSetup: CoreSetup } {
  return {
    coreSetup: {
      server,
    },
  };
}
