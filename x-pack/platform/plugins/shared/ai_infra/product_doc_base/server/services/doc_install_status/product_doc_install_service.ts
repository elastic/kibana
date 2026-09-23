/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ResourceTypes, type ProductName } from '@kbn/product-doc-common';
import { DocumentationProduct } from '@kbn/product-doc-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import { isImpliedDefaultElserInferenceId } from '@kbn/product-doc-common/src/is_default_inference_endpoint';
import type { ProductInstallState } from '../../../common/install_status';
import { productDocInstallStatusSavedObjectTypeName as typeName } from '../../../common/consts';
import type { ProductDocInstallStatusAttributes as TypeAttributes } from '../../saved_objects';
import type { SecurityLabsStatusResponse } from '../doc_manager/types';

const installStatusQuery = { type: typeName, perPage: 100 };

const allUninstalled = (): Record<ProductName, ProductInstallState> =>
  Object.values(DocumentationProduct).reduce((memo, product) => {
    memo[product] = { status: 'uninstalled' };
    return memo;
  }, {} as Record<ProductName, ProductInstallState>);

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
    const savedObjects = response?.saved_objects.filter((so) => {
      // Treat missing resource_type as product_doc for backwards compatibility.
      const resourceType = so.attributes?.resource_type ?? ResourceTypes.productDoc;
      return (
        resourceType === ResourceTypes.productDoc &&
        so.attributes?.installation_status === 'installed'
      );
    });
    const inferenceIds = new Set(
      savedObjects.map((so) => so.attributes?.inference_id ?? defaultInferenceEndpoints.ELSER)
    );
    return Array.from(inferenceIds);
  }

  async getPreviouslyInstalledSecurityLabsInferenceIds(): Promise<string[]> {
    const query = {
      type: typeName,
      perPage: 100,
    };
    const response = await this.soClient.find<TypeAttributes>(query);
    const savedObjects = response?.saved_objects.filter((so) => {
      return (
        so.attributes?.resource_type === ResourceTypes.securityLabs &&
        so.attributes?.installation_status === 'installed'
      );
    });
    const inferenceIds = new Set(
      savedObjects.map((so) => so.attributes?.inference_id ?? defaultInferenceEndpoints.ELSER)
    );
    return Array.from(inferenceIds);
  }

  /**
   * Returns the per-product installation status, reporting every product as uninstalled when the
   * saved objects cannot be read. Use `getInstallationStatusOrThrow` when a read failure must not
   * be mistaken for an uninstalled product.
   */
  async getInstallationStatus({
    inferenceId,
  }: {
    inferenceId: string;
  }): Promise<Record<ProductName, ProductInstallState>> {
    try {
      return await this.getInstallationStatusOrThrow({ inferenceId });
    } catch (error) {
      this.log.error(
        `An error occurred getting installation status saved object for inferenceId [${inferenceId}]
        Query: ${JSON.stringify(installStatusQuery, null, 2)}`,
        error
      );
      return allUninstalled();
    }
  }

  async getInstallationStatusOrThrow({
    inferenceId,
  }: {
    inferenceId: string;
  }): Promise<Record<ProductName, ProductInstallState>> {
    const installStatus = allUninstalled();
    const response = await this.soClient.find<TypeAttributes>(installStatusQuery);
    const savedObjects = isImpliedDefaultElserInferenceId(inferenceId)
      ? response?.saved_objects.filter((so) =>
          isImpliedDefaultElserInferenceId(so.attributes.inference_id)
        )
      : response?.saved_objects.filter((so) => so.attributes.inference_id === inferenceId);

    // Filter out Security Labs records (stored in the same SO type) so they don't overwrite
    // the product docs "security" product status.
    const productDocsSavedObjects = savedObjects?.filter((so) => {
      // Treat missing resource_type as product_doc for backwards compatibility.
      const resourceType = so.attributes?.resource_type ?? ResourceTypes.productDoc;
      return resourceType === ResourceTypes.productDoc;
    });

    productDocsSavedObjects?.forEach(({ attributes, updated_at: updatedAt }) => {
      installStatus[attributes.product_name as ProductName] = {
        status: attributes.installation_status,
        version: attributes.product_version,
        ...(attributes.last_installation_failure_reason
          ? { failureReason: attributes.last_installation_failure_reason }
          : {}),
        ...(updatedAt ? { updatedAt } : {}),
      };
    });

    return installStatus;
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
      resource_type: ResourceTypes.productDoc,
    };
    await this.soClient.update<TypeAttributes>(typeName, objectId, attributes, {
      upsert: attributes,
    });
  }

  async setUninstallationStarted(productName: ProductName, inferenceId: string | undefined) {
    const objectId = getObjectIdFromProductName(productName, inferenceId);
    await this.soClient.update<TypeAttributes>(typeName, objectId, {
      installation_status: 'uninstalling',
      inference_id: inferenceId,
      resource_type: ResourceTypes.productDoc,
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
      resource_type: ResourceTypes.productDoc,
    });
  }

  async setInstallationFailed(
    productName: ProductName,
    failureReason: string,
    inferenceId: string | undefined
  ) {
    const objectId = getObjectIdFromProductName(productName, inferenceId);
    const attributes = {
      installation_status: 'error' as const,
      last_installation_failure_reason: failureReason,
      inference_id: inferenceId,
      resource_type: ResourceTypes.productDoc,
    };
    // The install may fail before any status was written for this product
    await this.soClient.update<TypeAttributes>(typeName, objectId, attributes, {
      upsert: { ...attributes, product_name: productName, product_version: '' },
    });
  }

  async setUninstalled(productName: ProductName, inferenceId: string | undefined) {
    const objectId = getObjectIdFromProductName(productName, inferenceId);
    try {
      await this.soClient.update<TypeAttributes>(typeName, objectId, {
        installation_status: 'uninstalled',
        last_installation_failure_reason: '',
        inference_id: inferenceId,
        resource_type: ResourceTypes.productDoc,
      });
    } catch (e) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw e;
      }
    }
  }

  // Security Labs status helpers (stored in the same SO type but a different object id to avoid collisions)

  async getSecurityLabsInstallationStatus({
    inferenceId,
  }: {
    inferenceId: string;
  }): Promise<SecurityLabsStatusResponse> {
    const objectId = getSecurityLabsObjectId(inferenceId);
    try {
      const so = await this.soClient.get<TypeAttributes>(typeName, objectId);
      return {
        status: so.attributes.installation_status,
        version: so.attributes.product_version,
        ...(so.attributes.last_installation_failure_reason
          ? { failureReason: so.attributes.last_installation_failure_reason }
          : {}),
      };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return { status: 'uninstalled' };
      }
      throw e;
    }
  }

  async setSecurityLabsInstallationStarted(fields: { version: string; inferenceId: string }) {
    const { version, inferenceId } = fields;
    const objectId = getSecurityLabsObjectId(inferenceId);
    const attributes: TypeAttributes = {
      // Use product_name=security but disambiguate with resource_type, and a different object id.
      product_name: 'security',
      product_version: version,
      installation_status: 'installing',
      last_installation_failure_reason: '',
      inference_id: inferenceId,
      resource_type: ResourceTypes.securityLabs,
    };
    await this.soClient.update<TypeAttributes>(typeName, objectId, attributes, {
      upsert: attributes,
    });
  }

  async setSecurityLabsInstallationSuccessful(fields: {
    version: string;
    indexName: string;
    inferenceId: string;
  }) {
    const { version, indexName, inferenceId } = fields;
    const objectId = getSecurityLabsObjectId(inferenceId);
    await this.soClient.update<TypeAttributes>(typeName, objectId, {
      product_name: 'security',
      product_version: version,
      installation_status: 'installed',
      index_name: indexName,
      inference_id: inferenceId,
      resource_type: ResourceTypes.securityLabs,
    });
  }

  async setSecurityLabsInstallationFailed(fields: {
    version?: string;
    failureReason: string;
    inferenceId: string;
  }) {
    const { version, failureReason, inferenceId } = fields;
    const objectId = getSecurityLabsObjectId(inferenceId);
    const attributes = {
      ...(version ? { product_version: version } : {}),
      installation_status: 'error' as const,
      last_installation_failure_reason: failureReason,
      inference_id: inferenceId,
      resource_type: ResourceTypes.securityLabs,
    };
    // The install may fail before any status was written
    await this.soClient.update<TypeAttributes>(typeName, objectId, attributes, {
      upsert: { ...attributes, product_name: 'security', product_version: version ?? '' },
    });
  }

  async setSecurityLabsUninstalled(inferenceId: string) {
    const objectId = getSecurityLabsObjectId(inferenceId);
    try {
      await this.soClient.update<TypeAttributes>(typeName, objectId, {
        installation_status: 'uninstalled',
        last_installation_failure_reason: '',
        inference_id: inferenceId,
        resource_type: ResourceTypes.securityLabs,
      });
    } catch (e) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw e;
      }
    }
  }

  // OpenAPI spec status helpers (stored in the same SO type but a different object id to avoid collisions)

  async getOpenapiSpecInstallationStatus({
    inferenceId,
  }: {
    inferenceId: string;
  }): Promise<SecurityLabsStatusResponse> {
    const objectId = getOpenAPISpecObjectId(inferenceId);
    try {
      const so = await this.soClient.get<TypeAttributes>(typeName, objectId);
      return {
        status: so.attributes.installation_status,
        version: so.attributes.product_version,
        ...(so.attributes.last_installation_failure_reason
          ? { failureReason: so.attributes.last_installation_failure_reason }
          : {}),
        ...(so.updated_at ? { updatedAt: so.updated_at } : {}),
      };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return { status: 'uninstalled' };
      }
      throw e;
    }
  }

  async setOpenapiSpecInstallationStarted(fields: {
    productName: 'kibana' | 'elasticsearch';
    productVersion: string;
    inferenceId: string;
  }) {
    const { productName, productVersion, inferenceId } = fields;
    const objectId = getOpenAPISpecObjectId(inferenceId);
    const attributes: TypeAttributes = {
      product_name: productName,
      product_version: productVersion,
      installation_status: 'installing',
      last_installation_failure_reason: '',
      inference_id: inferenceId,
      resource_type: ResourceTypes.openapiSpec,
    };
    await this.soClient.update<TypeAttributes>(typeName, objectId, attributes, {
      upsert: attributes,
    });
  }

  async setOpenapiSpecInstallationSuccessful(fields: {
    productName: 'kibana' | 'elasticsearch';
    productVersion: string;
    indexName: string;
    inferenceId: string;
  }) {
    const { productName, productVersion, indexName, inferenceId } = fields;
    const objectId = getOpenAPISpecObjectId(inferenceId);
    await this.soClient.update<TypeAttributes>(typeName, objectId, {
      product_name: productName,
      product_version: productVersion,
      installation_status: 'installed',
      index_name: indexName,
      inference_id: inferenceId,
      resource_type: ResourceTypes.openapiSpec,
    });
  }

  async setOpenapiSpecInstallationFailed(fields: {
    productName: 'kibana' | 'elasticsearch';
    productVersion: string;
    failureReason: string;
    inferenceId: string;
  }) {
    const { productName, productVersion, failureReason, inferenceId } = fields;
    const objectId = getOpenAPISpecObjectId(inferenceId);
    const attributes: TypeAttributes = {
      installation_status: 'error',
      last_installation_failure_reason: failureReason,
      inference_id: inferenceId,
      resource_type: ResourceTypes.openapiSpec,
      product_name: productName,
      product_version: productVersion,
    };
    // The install may fail before any status was written
    await this.soClient.update<TypeAttributes>(typeName, objectId, attributes, {
      upsert: attributes,
    });
  }

  async setOpenapiSpecUninstalled(inferenceId: string | undefined) {
    const objectId = getOpenAPISpecObjectId(inferenceId);
    try {
      await this.soClient.update<TypeAttributes>(typeName, objectId, {
        installation_status: 'uninstalled',
        last_installation_failure_reason: '',
        inference_id: inferenceId,
        resource_type: ResourceTypes.openapiSpec,
      });
    } catch (e) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw e;
      }
    }
  }
}

const getObjectId = (
  sourceId: 'security-labs' | 'openapi-spec' | `product-doc-${ProductName}`,
  inferenceId?: string
) => {
  const inferenceIdPart = !isImpliedDefaultElserInferenceId(inferenceId) ? `-${inferenceId}` : '';
  return `kb-${sourceId}${inferenceIdPart}-status`.toLowerCase();
};
const getOpenAPISpecObjectId = (inferenceId?: string) => getObjectId('openapi-spec', inferenceId);

const getObjectIdFromProductName = (productName: ProductName, inferenceId: string | undefined) =>
  getObjectId(`product-doc-${productName}`, inferenceId);

const getSecurityLabsObjectId = (inferenceId?: string) => getObjectId('security-labs', inferenceId);
