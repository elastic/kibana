/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { host } from './host';
import { pod } from './pod';
import { container } from './container';
import { InventoryItemType } from './types';
export { metrics } from './metrics';

const inventoryModels = [host, pod, container];

export const findInventoryModel = (type: InventoryItemType) => {
  const model = inventoryModels.find(m => m.id === type);
  if (!model) {
    throw new Error(
      i18n.translate('xpack.infra.inventoryModels.findInventoryModel.error', {
        defaultMessage: "The inventory model you've attempted to find does not exist",
      })
    );
  }
  return model;
};
