/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type { ProductName } from '@kbn/product-doc-common';
import { productDocInstallStatusSavedObjectTypeName } from '../../common/consts';
import type { InstallationStatus } from '../../common/install_status';

/**
 * Interface describing the raw attributes of the product doc install SO type.
 * Contains more fields than the mappings, which only list
 * indexed fields.
 */
export interface ProductDocInstallStatusAttributes {
  product_name: ProductName;
  product_version: string;
  installation_status: InstallationStatus;
  last_installation_date?: number;
  last_installation_failure_reason?: string;
  index_name?: string;
}

export const productDocInstallStatusSavedObjectType: SavedObjectsType<ProductDocInstallStatusAttributes> =
  {
    name: productDocInstallStatusSavedObjectTypeName,
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {
        product_name: { type: 'keyword' },
        product_version: { type: 'keyword' },
        installation_status: { type: 'keyword' },
        last_installation_date: { type: 'date' },
        index_name: { type: 'keyword' },
      },
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {},
  };
