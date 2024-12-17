/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { ProductDocInstallStatus } from '../../../common/install_status';
import type { ProductDocInstallStatusAttributes } from '../../saved_objects';

export const soToModel = (
  so: SavedObject<ProductDocInstallStatusAttributes>
): ProductDocInstallStatus => {
  return {
    id: so.id,
    productName: so.attributes.product_name,
    productVersion: so.attributes.product_version,
    installationStatus: so.attributes.installation_status,
    indexName: so.attributes.index_name,
    lastInstallationDate: so.attributes.last_installation_date
      ? new Date(so.attributes.last_installation_date)
      : undefined,
    lastInstallationFailureReason: so.attributes.last_installation_failure_reason,
  };
};
