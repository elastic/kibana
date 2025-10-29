/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type {
  CloudConnector,
  CloudConnectorListOptions,
  CloudConnectorSecretReference,
} from '../../common/types/models/cloud_connector';
import { isAwsCloudConnectorVars, isAzureCloudConnectorVars } from '../../common/services';
import type { CloudConnectorSOAttributes } from '../types/so_attributes';
import type {
  CreateCloudConnectorRequest,
  UpdateCloudConnectorRequest,
} from '../../common/types/rest_spec/cloud_connector';
import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../common/constants';
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
  CloudConnectorUpdateError,
} from '../errors';

import { appContextService } from './app_context';

export interface CloudConnectorServiceInterface {
  create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest
  ): Promise<CloudConnector>;
  getList(
    soClient: SavedObjectsClientContract,
    options?: CloudConnectorListOptions
  ): Promise<CloudConnector[]>;
  getById(soClient: SavedObjectsClientContract, cloudConnectorId: string): Promise<CloudConnector>;
  update(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string,
    cloudConnectorUpdate: Partial<UpdateCloudConnectorRequest>
  ): Promise<CloudConnector>;
  delete(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string,
    force?: boolean
  ): Promise<{ id: string }>;
}

export class CloudConnectorService implements CloudConnectorServiceInterface {
  private static readonly EXTERNAL_ID_REGEX = /^[a-zA-Z0-9_-]{20}$/;

  protected getLogger(...childContextPaths: string[]): Logger {
    return appContextService.getLogger().get('CloudConnectorService', ...childContextPaths);
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

      // TODO: refactor this to remove the string type when the connector name is implemented https://github.com/elastic/security-team/issues/14283
      let name = cloudConnector.name;
      if (cloudConnector.cloudProvider === 'aws' && isAwsCloudConnectorVars(vars)) {
        name = vars.role_arn.value;
      } else if (cloudConnector.cloudProvider === 'azure' && isAzureCloudConnectorVars(vars)) {
        // azure_credentials_cloud_connector_id.value can be either a CloudConnectorSecretReference or a string
        const azureCredValue = vars.azure_credentials_cloud_connector_id.value;
        name = typeof azureCredValue === 'string' ? azureCredValue : azureCredValue.id;
      }

      // Check if space awareness is enabled for namespace handling
      const { isSpaceAwarenessEnabled } = await import('./spaces/helpers');
      const useSpaceAwareness = await isSpaceAwarenessEnabled();
      const namespace = useSpaceAwareness ? '*' : undefined;

      // Validate cloud connector vars based on provider
      const isValidVars =
        (cloudProvider === 'aws' && isAwsCloudConnectorVars(vars)) ||
        (cloudProvider === 'azure' && isAzureCloudConnectorVars(vars));

      if (!isValidVars) {
        throw new CloudConnectorCreateError(
          `CloudConnectorService Missing required variables for ${cloudProvider} cloud connector`
        );
      }

      const cloudConnectorAttributes: CloudConnectorSOAttributes = {
        name,
        namespace,
        cloudProvider,
        vars,
        packagePolicyCount: 1,
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
      };
    } catch (error) {
      logger.error('Failed to create cloud connector', error.message);
      throw new CloudConnectorCreateError(
        `CloudConnectorService Failed to create cloud connector: ${error.message}\n${error.stack}`
      );
    }
  }

  async getList(
    soClient: SavedObjectsClientContract,
    options?: CloudConnectorListOptions
  ): Promise<CloudConnector[]> {
    const logger = this.getLogger('getList');
    logger.debug('Getting cloud connectors list');

    try {
      const cloudConnectors = await soClient.find<CloudConnectorSOAttributes>({
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        page: options?.page || 1,
        perPage: options?.perPage || 20,
        sortField: 'created_at',
        sortOrder: 'desc',
      });

      logger.debug('Successfully retrieved cloud connectors list');

      return cloudConnectors.saved_objects.map((savedObject) => ({
        id: savedObject.id,
        ...savedObject.attributes,
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

      logger.info(`Successfully retrieved cloud connector ${cloudConnectorId}`);

      return {
        id: cloudConnector.id,
        ...cloudConnector.attributes,
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

      if (cloudConnectorUpdate.name) {
        updateAttributes.name = cloudConnectorUpdate.name;
      }

      if (cloudConnectorUpdate.vars) {
        const cloudProvider = existingCloudConnector.attributes.cloudProvider;

        const isValidVars =
          (cloudProvider === 'aws' && isAwsCloudConnectorVars(cloudConnectorUpdate.vars)) ||
          (cloudProvider === 'azure' && isAzureCloudConnectorVars(cloudConnectorUpdate.vars));

        if (!isValidVars) {
          throw new CloudConnectorUpdateError(
            `CloudConnectorService Missing required variables for ${cloudProvider} cloud connector update`
          );
        }

        updateAttributes.vars = cloudConnectorUpdate.vars;
      }

      // Update the saved object
      const updatedSavedObject = await soClient.update<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorId,
        updateAttributes
      );

      logger.info(`Successfully updated cloud connector ${cloudConnectorId}`);

      // Return the updated cloud connector with merged attributes
      const mergedAttributes = {
        ...existingCloudConnector.attributes,
        ...updatedSavedObject.attributes,
      };

      return {
        id: cloudConnectorId,
        ...mergedAttributes,
      };
    } catch (error) {
      logger.error('Failed to update cloud connector', error.message);
      throw new CloudConnectorCreateError(
        `Failed to update cloud connector: ${error.message}\n${error.stack}`
      );
    }
  }

  async delete(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string,
    force: boolean = false
  ): Promise<{ id: string }> {
    const logger = this.getLogger('delete');

    try {
      logger.info(`Deleting cloud connector ${cloudConnectorId} (force: ${force})`);

      // First, get the cloud connector to check packagePolicyCount
      const cloudConnector = await soClient.get<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorId
      );

      // Check if cloud connector is still in use by package policies (unless force is true)
      if (!force && cloudConnector.attributes.packagePolicyCount > 0) {
        const errorMessage = `Cannot delete cloud connector "${cloudConnector.attributes.name}" as it is being used by ${cloudConnector.attributes.packagePolicyCount} package policies`;
        logger.error(errorMessage);
        throw new CloudConnectorDeleteError(errorMessage);
      }

      // Log a warning if force deleting a connector that's still in use
      if (force && cloudConnector.attributes.packagePolicyCount > 0) {
        logger.warn(
          `Force deleting cloud connector "${cloudConnector.attributes.name}" which is still being used by ${cloudConnector.attributes.packagePolicyCount} package policies`
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
      if (!isAwsCloudConnectorVars(vars)) {
        logger.error('Package policy must contain valid AWS cloud connector variables');
        throw new CloudConnectorInvalidVarsError(
          'Package policy must contain role_arn and external_id'
        );
      }

      const roleArn = vars.role_arn.value;
      if (!roleArn) {
        logger.error('Package policy must contain role_arn variable');
        throw new CloudConnectorInvalidVarsError('Package policy must contain role_arn variable');
      }

      const externalId: CloudConnectorSecretReference = vars.external_id.value;
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
      if (!isAzureCloudConnectorVars(vars)) {
        logger.error('Package policy must contain valid Azure cloud connector variables');
        throw new CloudConnectorInvalidVarsError(
          `Package policy must contain ${TENANT_ID_VAR_NAME}, ${CLIENT_ID_VAR_NAME}, and ${AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID}`
        );
      }

      // Validate that all required Azure fields have valid secret references
      const tenantId = vars.tenant_id;
      const clientId = vars.client_id;
      const azureCredentials = vars.azure_credentials_cloud_connector_id;

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

      // azure_credentials_cloud_connector_id can be either:
      // 1. A CloudConnectorSecretReference (with id and isSecretRef)
      // 2. A plain string (cloud connector ID for reuse)
      const credValue = azureCredentials?.value;
      const isSecretRef =
        typeof credValue === 'object' &&
        credValue !== null &&
        'id' in credValue &&
        'isSecretRef' in credValue;
      const hasValidSecretRef = isSecretRef && credValue.id && credValue.isSecretRef;
      const hasValidStringValue = typeof credValue === 'string' && credValue.length > 0;

      if (!hasValidSecretRef && !hasValidStringValue) {
        logger.error(
          `Package policy must contain valid ${AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID} secret reference`
        );
        throw new CloudConnectorInvalidVarsError(
          `${AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID} must be a valid secret reference`
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
