/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GlobalSearchProviderResult, GlobalSearchResult } from './types';
import type { IBasePath } from './utils';
import { convertResultUrl } from './utils';

/**
 * Convert a {@link GlobalSearchProviderResult | provider result}
 * to a {@link GlobalSearchResult | service result}
 */
export const processProviderResult = (
  result: GlobalSearchProviderResult,
  basePath: IBasePath
): GlobalSearchResult => {
  return {
    ...result,
    url: convertResultUrl(result.url, basePath),
  };
};
