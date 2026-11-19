/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

export interface VectorProjectionServices {
  core: CoreStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

let services: VectorProjectionServices | undefined;

export const setServices = (nextServices: VectorProjectionServices) => {
  services = nextServices;
};

export const getServices = (): VectorProjectionServices => {
  if (!services) throw new Error('Vector projection services not initialized');
  return services;
};
