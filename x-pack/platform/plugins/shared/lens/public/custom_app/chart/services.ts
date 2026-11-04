/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '../..';

interface Services {
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
}

let services: Services | undefined;

/** Kept when Lens starts, for the chart that custom apps draw with it. */
export const setCustomAppServices = (value: Services): void => {
  services = value;
};

export const getServices = (): Services => {
  if (!services) throw new Error('Lens has not started yet');
  return services;
};
