/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CanvasServices, services } from '..';
import { searchService } from './search';

export const stubs: CanvasServices = {
  search: searchService,
};

export const startServices = async (providedServices: Partial<CanvasServices> = {}) => {
  Object.entries(services).forEach(([key, provider]) => {
    // @ts-expect-error Object.entries isn't strongly typed
    const stub = providedServices[key] || stubs[key];
    provider.setService(stub);
  });
};
