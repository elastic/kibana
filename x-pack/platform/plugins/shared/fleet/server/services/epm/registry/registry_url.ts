/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../..';

// from https://github.com/elastic/package-registry#docker (maybe from OpenAPI one day)
// Package storage V2 URL
const PACKAGE_STORAGE_REGISTRY_URL = 'https://epr.elastic.co';

export const getRegistryUrl = (): string => {
  const customUrl = appContextService.getConfig()?.registryUrl;

  if (customUrl) {
    return customUrl;
  }

  return PACKAGE_STORAGE_REGISTRY_URL;
};
