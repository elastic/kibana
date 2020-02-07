/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';

/**
 * This hook provides access to the "injected variables" provided by the
 * platform. While it doesn't need to be a hook right now, it has been written
 * as one in order to keep the API stable despite the upcoming injection
 * through the context after the new platform migration.
 */
export const useKibanaInjectedVar = (name: string, defaultValue?: unknown) => {
  const injectedMetadata = npSetup.core.injectedMetadata;
  return injectedMetadata.getInjectedVar(name, defaultValue);
};
