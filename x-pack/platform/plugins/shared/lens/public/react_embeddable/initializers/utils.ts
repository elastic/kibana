/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { LensEmbeddableStartServices } from '../types';

export function isESQLModeEnabled({ uiSettings }: Pick<LensEmbeddableStartServices, 'uiSettings'>) {
  return uiSettings.get(ENABLE_ESQL);
}
