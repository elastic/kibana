/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ProductName, DocumentationProduct } from '@kbn/product-doc-common';
import type { ProductInstallState } from '../../../common/install_status';
import { productDocInstallStatusSavedObjectTypeName as typeName } from '../../../common/consts';
import type { ProductDocInstallStatusAttributes as TypeAttributes } from '../../saved_objects';

export class ProductDocInstallClient {
  private soClient: SavedObjectsClientContract;

  constructor({ soClient }: { soClient: SavedObjectsClientContract }) {
    this.soClient = soClient;
  }

  async getInstallationStatus(): Promise<Record<ProductName, ProductInstallState>> {
    const response = await this.soClient.find<TypeAttributes>({
      type: typeName,
      perPage: 100,
    });

    const installStatus = Object.values(DocumentationProduct).reduce((memo, product) => {
      memo[product] = { status: 'uninstalled' };
      return memo;
    }, {} as Record<ProductName, ProductInstallState>);

    response.saved_objects.forEach(({ attributes }) => {
      installStatus[attributes.product_name as ProductName] = {
        status: attributes.installation_status,
        version: attributes.product_version,
      };
    });

    return installStatus;
  }

  async setInstallationStarted(fields: { productName: ProductName; productVersion: string }) {
    const { productName, productVersion } = fields;
    const objectId = getObjectIdFromProductName(productName);
    const attributes = {
      product_name: productName,
      product_version: productVersion,
      installation_status: 'installing' as const,
      last_installation_failure_reason: '',
    };
    await this.soClient.update<TypeAttributes>(typeName, objectId, attributes, {
      upsert: attributes,
    });
  }

  async setInstallationSuccessful(productName: ProductName, indexName: string) {
    const objectId = getObjectIdFromProductName(productName);
    await this.soClient.update<TypeAttributes>(typeName, objectId, {
      installation_status: 'installed',
      index_name: indexName,
    });
  }

  async setInstallationFailed(productName: ProductName, failureReason: string) {
    const objectId = getObjectIdFromProductName(productName);
    await this.soClient.update<TypeAttributes>(typeName, objectId, {
      installation_status: 'error',
      last_installation_failure_reason: failureReason,
    });
  }

  async setUninstalled(productName: ProductName) {
    const objectId = getObjectIdFromProductName(productName);
    try {
      await this.soClient.update<TypeAttributes>(typeName, objectId, {
        installation_status: 'uninstalled',
        last_installation_failure_reason: '',
      });
    } catch (e) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw e;
      }
    }
  }
}

const getObjectIdFromProductName = (productName: ProductName) =>
  `kb-product-doc-${productName}-status`.toLowerCase();
