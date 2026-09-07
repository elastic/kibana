/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { ProductName, ResourceType } from '@kbn/product-doc-common';
import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { productDocInstallStatusSavedObjectTypeName } from '../../common/consts';
import type { InstallationStatus } from '../../common/install_status';

const productDocInstallStatusAttributesSchemaV1 = schema.object({
  product_name: schema.string(),
  product_version: schema.string(),
  installation_status: schema.string(),
  last_installation_date: schema.maybe(schema.number()),
  last_installation_failure_reason: schema.maybe(schema.string()),
  index_name: schema.maybe(schema.string()),
  inference_id: schema.maybe(schema.string()),
});

const productDocInstallStatusAttributesSchemaV2 = productDocInstallStatusAttributesSchemaV1.extends(
  {
    resource_type: schema.maybe(schema.string()),
  }
);

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
  inference_id?: string;
  /**
   * Resource type: 'product_doc' for product documentation, 'security_labs' for Security Labs content.
   * Defaults to 'product_doc' for backwards compatibility.
   */
  resource_type?: ResourceType;
}

const modelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        inference_id: { type: 'keyword' },
      },
    },
  ],
};

const modelVersion2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        resource_type: { type: 'keyword' },
      },
    },
  ],
  schemas: {
    forwardCompatibility: productDocInstallStatusAttributesSchemaV2.extends(
      {},
      { unknowns: 'ignore' }
    ),
    create: productDocInstallStatusAttributesSchemaV2,
  },
};

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
        inference_id: { type: 'keyword' },
        resource_type: { type: 'keyword' },
      },
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: { '1': modelVersion1, '2': modelVersion2 },
  };
