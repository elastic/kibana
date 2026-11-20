/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';

interface Services {
  core: CoreStart;
}

let services: Services | undefined;

/** Kept when the plugin starts, for the part of running a workflow that is drawn inside a custom app. */
export const setCustomAppServices = (value: Services): void => {
  services = value;
};

export const getServices = (): Services => {
  if (!services) throw new Error('Workflows has not started yet');
  return services;
};
