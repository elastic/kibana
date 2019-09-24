/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { layout } from './layout';
import { toolbar } from './toolbar';
import { metrics } from './metrics';
import { InventoryModel } from '../types';
export const pod: InventoryModel = {
  id: 'pod',
  requiredModules: ['kubernetes'],
  layout,
  toolbar,
  metrics,
};
