/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DependencyList } from 'react';
import type { MlPluginSetup } from '..';
import type { MlLocatorParams } from '../../common/types/locator';

/**
 * Provides a URL to ML plugin page
 * TODO remove basePath parameter
 */
export const useMlHref = (
  ml: MlPluginSetup | undefined,
  basePath: string | undefined,
  params: MlLocatorParams,
  dependencies?: DependencyList
) => {
  return ml && ml.locator
    ? ml.locator.useUrl(params, undefined, dependencies)
    : basePath !== undefined
    ? `${basePath}/app/ml/${params.page}`
    : '';
};
