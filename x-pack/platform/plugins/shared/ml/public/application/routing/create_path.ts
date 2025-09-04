/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlPages } from '@kbn/ml-common-types/locator_ml_pages';

export function createPath(page: MlPages, additionalPrefix?: string) {
  return `/${page}${additionalPrefix ? `${additionalPrefix}` : ''}`;
}
