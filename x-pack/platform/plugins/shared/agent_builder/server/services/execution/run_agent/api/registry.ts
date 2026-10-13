/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiTarget } from '@kbn/agent-builder-common';
import type { ApiRegistry } from './types';

let registriesPromise: Promise<Record<ApiTarget, ApiRegistry>> | undefined;

/**
 * Lazily imports the `@elastic/schemas` tool registries and returns them keyed
 * by {@link ApiTarget}.
 *
 */
export const getRegistries = (): Promise<Record<ApiTarget, ApiRegistry>> => {
  if (!registriesPromise) {
    registriesPromise = Promise.all([
      import('@elastic/schemas/es/tools/index.js'),
      import('@elastic/schemas/kibana/tools/index.js'),
    ]).then(([esTools, kibanaTools]) => ({
      elasticsearch: esTools.esRegistry,
      kibana: kibanaTools.kibanaRegistry,
    }));
  }
  return registriesPromise;
};
