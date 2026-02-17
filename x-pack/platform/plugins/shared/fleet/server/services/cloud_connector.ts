/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type {
  CloudConnector,
  CloudConnectorListOptions,
  CloudConnectorSecretReference,
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
} from '../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes } from '../types/so_attributes';
import type {
  CreateCloudConnectorRequest,
  UpdateCloudConnectorRequest,
} from '../../common/types/rest_spec/cloud_connector';
import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../common/constants';
import {
  TENANT_ID_VAR_NAME,
  CLIENT_ID_VAR_NAME,
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID,
} from '../../common/constants/cloud_connector';

import {
  CloudConnectorCreateError,
  CloudConnectorGetListError,
  CloudConnectorInvalidVarsError,
  CloudConnectorDeleteError,
  rethrowIfInstanceOrWrap,
} from '../errors';

import { appContextService } from './app_context';
import { extractSecretIdsFromCloudConnectorVars } from './secrets/cloud_connector';
import { deleteSecrets } from './secrets/common';

export interface CloudConnectorServiceInterface {
  create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest
  ): Promise<CloudConnector>;
  getList(
    soClient: SavedObjectsClientContract,
    options?: Omit<CloudConnectorListOptions, 'fields'>
  ): Promise<CloudConnector[]>;
  getList(
    soClient: SavedObjectsClientContract,
    options: CloudConnectorListOptions & { fields: string[] }
  ): Promise<Partial<CloudConnector>[]>;
  getById(soClient: SavedObjectsClientContract, cloudConnectorId: string): Promise<CloudConnector>;
  update(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string,
    cloudConnectorUpdate: Partial<UpdateCloudConnectorRequest>
  ): Promise<CloudConnector>;
  delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    cloudConnectorId: string,
    force?: boolean
  ): Promise<{ id: string }>;
}

export class CloudConnectorService implements CloudConnectorServiceInterface {
  private static readonly EXTERNAL_ID_REGEX = /^[a-zA-Z0-9_-]{20}$/;

  protected getLogger(...childContextPaths: string[]): Logger {
    return appContextService.getLogger().get('CloudConnectorService', ...childContextPaths);
  }

  /**
   * Normalizes a cloud connector name by trimming and collapsing consecutive spaces
   * @param name - The name to normalize
   * @returns The normalized name
   */
  private static normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  /**
   * Queries package policies to get a map of cloud connector IDs to their package policy counts.
   * Uses ES aggregations for efficient counting instead of fetching all documents.
   * @param soClient - Saved objects client
   * @returns Map of cloud connector ID to package policy count
   */
  private async getPackagePolicyCountsMap(
    soClient: SavedObjectsClientContract
  ): Promise<Map<string, number>> {
    const logger = this.getLogger('getPackagePolicyCountsMap');

    try {
      const result = await soClient.find<{ cloud_connector_id?: string }>({
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:*`,
        perPage: 0, // We don't need the actual documents, only aggregation results
        aggs: {
          packagePolicyCounts: {
            terms: {
              field: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id`,
              size: SO_SEARCH_LIMIT,
            },
          },
        },
      });

      const countMap = new Map<string, number>();
      const aggregations = result.aggregations as
        | {
            packagePolicyCounts?: {
              buckets?: Array<{ key: string; doc_count: number }>;
            };
          }
        | undefined;
      const buckets = aggregations?.packagePolicyCounts?.buckets || [];

      for (const bucket of buckets) {
        countMap.set(bucket.key, bucket.doc_count);
      }

      return countMap;
    } catch (error) {
      logger.error(`Failed to get package policy counts: ${error.message}`);
      return new Map();
    }
  }

  /**
   * Gets the package policy count for a specific cloud connector.
   * @param soClient - Saved objects client
   * @param cloudConnectorId - ID of the cloud connector
   * @returns The number of package policies using this cloud connector
   */
  private async getPackagePolicyCount(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string
  ): Promise<number> {
    const logger = this.getLogger('getPackagePolicyCount');

    try {
      const result = await soClient.find<{ cloud_connector_id?: string }>({
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:"${cloudConnectorId}"`,
        perPage: 0, // We only need the count
      });

      return result.total;
    } catch (error) {
      logger.error(
        `Failed to get package policy count for connector ${cloudConnectorId}: ${error.message}`
      );
      return 0;
    }
  }

  /**
   * Validates and normalizes a cloud connector name, checking for duplicates
   * @param soClient - Saved objects client
   * @param name - The name to validate
   * @param excludeId - Optional cloud connector ID to exclude from duplicate check (for updates)
   * @returns The normalized name
   * @throws CloudConnectorCreateError if a duplicate name is found
   */
  private async validateAndNormalizeName(
    soClient: SavedObjectsClientContract,
    name: string,
    excludeId?: string
  ): Promise<string> {
    const normalizedName = CloudConnectorService.normalizeName(name);

    // Check for existing connector with same name (case-insensitive, normalized)
    const existingConnectors = await this.getList(soClient, {
      perPage: SO_SEARCH_LIMIT,
      fields: ['name'],
    });
    const normalizedNameLower = normalizedName.toLowerCase();
    const duplicateConnectorName = existingConnectors.find((c) => {
      // Skip the current connector when updating
      if (excludeId && c.id === excludeId) {
        return false;
      }
      // c.name is guaranteed to exist since we requested the 'name' field
      return (
        c.name && CloudConnectorService.normalizeName(c.name).toLowerCase() === normalizedNameLower
      );
    });

    if (duplicateConnectorName) {
      throw new CloudConnectorCreateError('A cloud connector with this name already exists');
    }

    return normalizedName;
  }

  async create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest
  ): Promise<CloudConnector> {
    const logger = this.getLogger('create');

    try {
      logger.info('Creating cloud connector');
      this.validateCloudConnectorDetails(cloudConnector);

      const { vars, cloudProvider } = cloudConnector;

      if (!vars || Object.keys(vars).length === 0) {
        logger.error(`Package policy must contain ${cloudProvider} input vars`);
        throw new CloudConnectorCreateError(
          `CloudConnectorService Package policy must contain ${cloudProvider} input vars`
        );
      }

      // Validate and normalize the name, checking for duplicates
      const name = await this.validateAndNormalizeName(soClient, cloudConnector.name);

      // Check if space awareness is enabled for namespace handling
      const { isSpaceAwarenessEnabled } = await import('./spaces/helpers');
      const useSpaceAwareness = await isSpaceAwarenessEnabled();
      const namespace = useSpaceAwareness ? '*' : undefined;

      const cloudConnectorAttributes: CloudConnectorSOAttributes = {
        name,
        namespace,
        cloudProvider,
        accountType: cloudConnector.accountType,
        vars,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const savedObject = await soClient.create<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorAttributes
      );

      logger.info('Successfully created cloud connector');

      return {
        id: savedObject.id,
        ...savedObject.attributes,
        packagePolicyCount: 0,
      };
    } catch (error) {
      logger.error(
        `Failed to create cloud connector: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      rethrowIfInstanceOrWrap(
        error,
        CloudConnectorCreateError,
        'CloudConnectorService Failed to create cloud connector'
      );
    }
  }

  // Overload signatures
  async getList(
    soClient: SavedObjectsClientContract,
    options?: Omit<CloudConnectorListOptions, 'fields'>
  ): Promise<CloudConnector[]>;
  async getList(
    soClient: SavedObjectsClientContract,
    options: CloudConnectorListOptions & { fields: string[] }
  ): Promise<Partial<CloudConnector>[]>;
  // Implementation
  async getList(
    soClient: SavedObjectsClientContract,
    options?: CloudConnectorListOptions
  ): Promise<CloudConnector[] | Partial<CloudConnector>[]> {
    const logger = this.getLogger('getList');
    logger.debug('Getting cloud connectors list');

    try {
      const findOptions: any = {
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        page: options?.page || 1,
        perPage: options?.perPage || 20,
        sortField: 'created_at',
        sortOrder: 'desc',
      };

      // Add KQL filter if specified
      if (options?.kuery) {
        findOptions.filter = options.kuery;
      }

      // Add fields filter if specified
      if (options?.fields) {
        findOptions.fields = options.fields;
      }

      const cloudConnectors = await soClient.find<CloudConnectorSOAttributes>(findOptions);

      // Only compute package policy counts if we're fetching all fields
      // (not when using fields filter for internal queries like duplicate name checking)
      const shouldComputeCounts = !options?.fields;
      const countMap = shouldComputeCounts
        ? await this.getPackagePolicyCountsMap(soClient)
        : new Map<string, number>();

      logger.debug('Successfully retrieved cloud connectors list');

      // When using fields filter (internal queries), return partial objects
      // When fetching all fields, include computed packagePolicyCount
      return cloudConnectors.saved_objects.map((savedObject) => ({
        id: savedObject.id,
        ...savedObject.attributes,
        ...(shouldComputeCounts && { packagePolicyCount: countMap.get(savedObject.id) || 0 }),
      }));
    } catch (error) {
      logger.error('Failed to get cloud connectors list', error.message);
      throw new CloudConnectorGetListError(
        `Failed to get cloud connectors list: ${error.message}\n${error.stack}`
      );
    }
  }

  async getById(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string
  ): Promise<CloudConnector> {
    const logger = this.getLogger('getById');

    try {
      logger.info(`Getting cloud connector ${cloudConnectorId}`);

      const cloudConnector = await soClient.get<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorId
      );

      // Compute packagePolicyCount dynamically
      const packagePolicyCount = await this.getPackagePolicyCount(soClient, cloudConnectorId);

      logger.info(`Successfully retrieved cloud connector ${cloudConnectorId}`);

      return {
        id: cloudConnector.id,
        ...cloudConnector.attributes,
        packagePolicyCount,
      };
    } catch (error) {
      logger.error('Failed to get cloud connector', error.message);
      throw new CloudConnectorGetListError(
        `Failed to get cloud connector: ${error.message}\n${error.stack}`
      );
    }
  }

  async update(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string,
    cloudConnectorUpdate: Partial<UpdateCloudConnectorRequest>
  ): Promise<CloudConnector> {
    const logger = this.getLogger('update');

    try {
      logger.info(`Updating cloud connector ${cloudConnectorId}`);

      // Get existing cloud connector
      const existingCloudConnector = await soClient.get<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorId
      );

      // Validate updates if vars are provided
      if (cloudConnectorUpdate.vars) {
        const tempCloudConnector = {
          name: cloudConnectorUpdate.name || existingCloudConnector.attributes.name,
          vars: cloudConnectorUpdate.vars,
          cloudProvider: existingCloudConnector.attributes.cloudProvider,
        };
        this.validateCloudConnectorDetails(tempCloudConnector);
      }

      // Prepare update attributes
      const updateAttributes: Partial<CloudConnectorSOAttributes> = {
        updated_at: new Date().toISOString(),
      };

      // Validate and normalize name if provided, checking for duplicates (excluding current connector)
      if (cloudConnectorUpdate.name) {
        updateAttributes.name = await this.validateAndNormalizeName(
          soClient,
          cloudConnectorUpdate.name,
          cloudConnectorId
        );
      }

      if (cloudConnectorUpdate.accountType !== undefined) {
        updateAttributes.accountType = cloudConnectorUpdate.accountType;
      }

      if (cloudConnectorUpdate.vars) {
        updateAttributes.vars = cloudConnectorUpdate.vars;
      }

      // Update the saved object
      const updatedSavedObject = await soClient.update<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorId,
        updateAttributes
      );

      logger.info(`Successfully updated cloud connector ${cloudConnectorId}`);

      const packagePolicyCount = await this.getPackagePolicyCount(soClient, cloudConnectorId);

      // Return the updated cloud connector with merged attributes
      const mergedAttributes = {
        ...existingCloudConnector.attributes,
        ...updatedSavedObject.attributes,
      };

      return {
        id: cloudConnectorId,
        ...mergedAttributes,
        packagePolicyCount,
      };
    } catch (error) {
      logger.error(
        `Failed to update cloud connector: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      rethrowIfInstanceOrWrap(error, CloudConnectorCreateError, 'Failed to update cloud connector');
    }
  }

  async delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    cloudConnectorId: string,
    force: boolean = false
  ): Promise<{ id: string }> {
    const logger = this.getLogger('delete');

    try {
      logger.info(`Deleting cloud connector ${cloudConnectorId} (force: ${force})`);

      // First, get the cloud connector to get its name for error messages
      const cloudConnector = await soClient.get<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorId
      );

      // Query actual package policy count dynamically (source of truth)
      const packagePolicyCount = await this.getPackagePolicyCount(soClient, cloudConnectorId);

      // Check if cloud connector is still in use by package policies (unless force is true)
      if (!force && packagePolicyCount > 0) {
        const errorMessage = `Cannot delete cloud connector "${cloudConnector.attributes.name}" as it is being used by ${packagePolicyCount} package policies`;
        logger.error(errorMessage);
        throw new CloudConnectorDeleteError(errorMessage);
      }

      // Log a warning if force deleting a connector that's still in use
      if (force && packagePolicyCount > 0) {
        logger.warn(
          `Force deleting cloud connector "${cloudConnector.attributes.name}" which is still being used by ${packagePolicyCount} package policies`
        );
      }

      // Extract and delete secrets before deleting the cloud connector
      try {
        const secretIds = extractSecretIdsFromCloudConnectorVars(
          cloudConnector.attributes.cloudProvider,
          cloudConnector.attributes.vars
        );

        if (secretIds.length > 0) {
          logger.debug(
            `Deleting ${secretIds.length} secret(s) associated with cloud connector ${cloudConnectorId}`
          );
          await deleteSecrets({ esClient, ids: secretIds });
          logger.info(
            `Successfully deleted ${secretIds.length} secret(s) for cloud connector ${cloudConnectorId}`
          );
        } else {
          logger.debug(`No secrets to delete for cloud connector ${cloudConnectorId}`);
        }
      } catch (secretError) {
        // Log the error but don't fail the deletion
        logger.warn(
          `Failed to delete secrets for cloud connector ${cloudConnectorId}: ${secretError.message}`,
          secretError
        );
      }

      // Delete the cloud connector
      await soClient.delete(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, cloudConnectorId);

      logger.info(`Successfully deleted cloud connector ${cloudConnectorId}`);

      return {
        id: cloudConnectorId,
      };
    } catch (error) {
      logger.error('Failed to delete cloud connector', error.message);

      // Re-throw CloudConnectorDeleteError as-is to preserve the original error message
      if (error instanceof CloudConnectorDeleteError) {
        throw error;
      }

      throw new CloudConnectorDeleteError(
        `Failed to delete cloud connector: ${error.message}\n${error.stack}`
      );
    }
  }

  private validateCloudConnectorDetails(cloudConnector: CreateCloudConnectorRequest) {
    const logger = this.getLogger('validate cloud connector details');
    const vars = cloudConnector.vars;

    if (cloudConnector.cloudProvider === 'aws') {
      // Type assertion is safe here because we perform runtime validation below
      const awsVars = vars as AwsCloudConnectorVars;
      const roleArn = awsVars.role_arn?.value;
      if (!roleArn) {
        logger.error('Package policy must contain role_arn variable');
        throw new CloudConnectorInvalidVarsError('Package policy must contain role_arn variable');
      }

      const externalId: CloudConnectorSecretReference = awsVars.external_id?.value;
      if (!externalId) {
        logger.error('Package policy must contain valid external_id secret reference');
        throw new CloudConnectorInvalidVarsError(
          'Package policy must contain valid external_id secret reference'
        );
      }

      const isValidExternalId =
        externalId?.id &&
        externalId?.isSecretRef &&
        CloudConnectorService.EXTERNAL_ID_REGEX.test(externalId.id);

      if (!isValidExternalId) {
        logger.error('External ID secret reference must be a valid secret reference');
        throw new CloudConnectorInvalidVarsError('External ID secret reference is not valid');
      }
    } else if (cloudConnector.cloudProvider === 'azure') {
      // Type assertion is safe here because we perform runtime validation below
      const azureVars = vars as AzureCloudConnectorVars;
      // Validate that all required Azure fields have valid secret references
      const tenantId = azureVars.tenant_id;
      const clientId = azureVars.client_id;
      const azureCredentials = azureVars.azure_credentials_cloud_connector_id;

      if (!tenantId?.value?.id || !tenantId?.value?.isSecretRef) {
        logger.error(`Package policy must contain valid ${TENANT_ID_VAR_NAME} secret reference`);
        throw new CloudConnectorInvalidVarsError(
          `${TENANT_ID_VAR_NAME} must be a valid secret reference`
        );
      }

      if (!clientId?.value?.id || !clientId?.value?.isSecretRef) {
        logger.error(`Package policy must contain valid ${CLIENT_ID_VAR_NAME} secret reference`);
        throw new CloudConnectorInvalidVarsError(
          `${CLIENT_ID_VAR_NAME} must be a valid secret reference`
        );
      }

      if (!azureCredentials?.value) {
        logger.error(
          `Package policy must contain valid ${AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID} value`
        );
        throw new CloudConnectorInvalidVarsError(
          `${AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID} must be a valid string`
        );
      }
    } else {
      logger.error(`Unsupported cloud provider: ${cloudConnector.cloudProvider}`);
      throw new CloudConnectorCreateError(
        `Unsupported cloud provider: ${cloudConnector.cloudProvider}`
      );
    }
  }
}

export const cloudConnectorService = new CloudConnectorService();
