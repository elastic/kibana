/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ProductName, DocumentationProduct } from '@kbn/product-doc-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import { isImpliedDefaultElserInferenceId } from '@kbn/product-doc-common/src/is_default_inference_endpoint';
import type { ProductInstallState } from '../../../common/install_status';
import { productDocInstallStatusSavedObjectTypeName as typeName } from '../../../common/consts';
import type { ProductDocInstallStatusAttributes as TypeAttributes } from '../../saved_objects';

export class ProductDocInstallClient {
  private soClient: SavedObjectsClientContract;
  private log: Logger;

  constructor({ soClient, log }: { soClient: SavedObjectsClientContract; log: Logger }) {
    this.soClient = soClient;
    this.log = log;
  }

  async getPreviouslyInstalledInferenceIds(): Promise<string[]> {
    const query = {
      type: typeName,
      perPage: 100,
    };
    const response = await this.soClient.find<TypeAttributes>(query);
    const inferenceIds = new Set(
      response?.saved_objects.map(
        (so) => so.attributes?.inference_id ?? defaultInferenceEndpoints.ELSER
      )
    );
    return Array.from(inferenceIds);
  }

  async getInstallationStatus({
    inferenceId,
  }: {
    inferenceId: string;
  }): Promise<Record<ProductName, ProductInstallState>> {
    const query = {
      type: typeName,
      perPage: 100,
    };
    const installStatus = Object.values(DocumentationProduct).reduce((memo, product) => {
      memo[product] = { status: 'uninstalled' };
      return memo;
    }, {} as Record<ProductName, ProductInstallState>);
    try {
      const response = await this.soClient.find<TypeAttributes>(query);
      const savedObjects = isImpliedDefaultElserInferenceId(inferenceId)
        ? response?.saved_objects.filter((so) =>
            isImpliedDefaultElserInferenceId(so.attributes.inference_id)
          )
        : response?.saved_objects.filter((so) => so.attributes.inference_id === inferenceId);

      savedObjects?.forEach(({ attributes }) => {
        installStatus[attributes.product_name as ProductName] = {
          status: attributes.installation_status,
          version: attributes.product_version,
          ...(attributes.last_installation_failure_reason
            ? { failureReason: attributes.last_installation_failure_reason }
            : {}),
        };
      });

      return installStatus;
    } catch (error) {
      this.log.error(
        `An error occurred getting installation status saved object for inferenceId [${inferenceId}]
        Query: ${JSON.stringify(query, null, 2)}`,
        error
      );
      return installStatus;
    }
  }

  async setInstallationStarted(fields: {
    productName: ProductName;
    productVersion: string;
    inferenceId: string | undefined;
  }) {
    const { productName, productVersion, inferenceId } = fields;
    const objectId = getObjectIdFromProductName(productName, inferenceId);
    const attributes = {
      product_name: productName,
      product_version: productVersion,
      installation_status: 'installing' as const,
      last_installation_failure_reason: '',
      inference_id: inferenceId,
    };
    await this.soClient.update<TypeAttributes>(typeName, objectId, attributes, {
      upsert: attributes,
    });
  }

  async setInstallationSuccessful(
    productName: ProductName,
    indexName: string,
    inferenceId: string | undefined
  ) {
    const objectId = getObjectIdFromProductName(productName, inferenceId);
    await this.soClient.update<TypeAttributes>(typeName, objectId, {
      installation_status: 'installed',
      index_name: indexName,
      inference_id: inferenceId,
    });
  }

  async setInstallationFailed(
    productName: ProductName,
    failureReason: string,
    inferenceId: string | undefined
  ) {
    const objectId = getObjectIdFromProductName(productName, inferenceId);
    await this.soClient.update<TypeAttributes>(typeName, objectId, {
      installation_status: 'error',
      last_installation_failure_reason: failureReason,
      inference_id: inferenceId,
    });
  }

  async setUninstalled(productName: ProductName, inferenceId: string | undefined) {
    const objectId = getObjectIdFromProductName(productName, inferenceId);
    try {
      await this.soClient.update<TypeAttributes>(typeName, objectId, {
        installation_status: 'uninstalled',
        last_installation_failure_reason: '',
        inference_id: inferenceId,
      });
    } catch (e) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw e;
      }
    }
  }
}

const getObjectIdFromProductName = (productName: ProductName, inferenceId: string | undefined) => {
  const inferenceIdPart = !isImpliedDefaultElserInferenceId(inferenceId) ? `-${inferenceId}` : '';
  return `kb-product-doc-${productName}${inferenceIdPart}-status`.toLowerCase();
};
