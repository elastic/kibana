/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { infraSourceConfigurationSavedObjectMappings } from './lib/sources';
import { metricsExplorerViewSavedObjectMappings } from '../common/saved_objects/metrics_explorer_view';
import { inventoryViewSavedObjectMappings } from '../common/saved_objects/inventory_view';

export const savedObjectMappings = {
  ...infraSourceConfigurationSavedObjectMappings,
  ...metricsExplorerViewSavedObjectMappings,
  ...inventoryViewSavedObjectMappings,
};
