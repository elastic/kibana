/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '..';

export const airGappedUtils = () => {
  const config = appContextService.getConfig();
  const hasRegistryUrls = config?.registryUrl || config?.registryProxyUrl;
  const isAirGapped = config?.isAirGapped;

  const shouldSkipRegistryRequests = isAirGapped && !hasRegistryUrls;

  return { hasRegistryUrls, isAirGapped, shouldSkipRegistryRequests };
};
