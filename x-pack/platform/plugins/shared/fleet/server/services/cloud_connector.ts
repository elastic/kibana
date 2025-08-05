/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { PackagePolicy } from '../../common/types/models/package_policy';
import type {
  CloudConnectorSO,
  CloudConnectorListOptions,
  CloudProvider,
  CloudConnectorVars,
} from '../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes } from '../types/so_attributes';
import type { CreateCloudConnectorRequest } from '../routes/cloud_connector/handlers';
import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../common/constants';

import { appContextService } from './app_context';

export interface CloudConnectorServiceInterface {
  create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest,
    packagePolicy?: PackagePolicy
  ): Promise<CloudConnectorSO>;
  getList(
    soClient: SavedObjectsClientContract,
    options?: CloudConnectorListOptions
  ): Promise<CloudConnectorSO[]>;
}

export class CloudConnectorService implements CloudConnectorServiceInterface {
  protected getLogger(...childContextPaths: string[]): Logger {
    return appContextService
      .getLogger()
      .get('[Cloud Connector API] CloudConnectorService', ...childContextPaths);
  }

  async create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest,
    packagePolicy?: PackagePolicy
  ): Promise<CloudConnectorSO> {
    const logger = this.getLogger('create');
    logger.debug('Creating cloud connector');

    try {
      logger.info('Creating cloud connector');

      // Extract cloud variables from package policy
      const { cloudProvider, vars, name } = this.extractCloudVars(cloudConnector, packagePolicy);

      if (!vars || Object.keys(vars).length === 0) {
        throw new Error('Package policy must contain cloud provider variables');
      }

      // Create cloud connector saved object
      const cloudConnectorAttributes: CloudConnectorSOAttributes = {
        name,
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
        name: savedObject.attributes.name,
        cloudProvider: savedObject.attributes.cloudProvider,
        vars: savedObject.attributes.vars,
        packagePolicyCount: savedObject.attributes.packagePolicyCount,
        created_at: savedObject.attributes.created_at,
        updated_at: savedObject.attributes.updated_at,
      };
    } catch (error) {
      logger.error('Failed to create cloud connector', error.message);
      throw error;
    }
  }

  async getList(
    soClient: SavedObjectsClientContract,
    options?: CloudConnectorListOptions
  ): Promise<CloudConnectorSO[]> {
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

      return cloudConnectors.saved_objects.map((so) => ({
        id: so.id,
        name: so.attributes.name,
        cloudProvider: so.attributes.cloudProvider,
        vars: so.attributes.vars,
        packagePolicyCount: so.attributes.packagePolicyCount,
        created_at: so.attributes.created_at,
        updated_at: so.attributes.updated_at,
      }));
    } catch (error) {
      logger.error('Failed to get cloud connectors list');
      throw error;
    }
  }

  private extractCloudVars(
    cloudConnector: CreateCloudConnectorRequest,
    packagePolicy: PackagePolicy | undefined
  ): {
    cloudProvider: CloudProvider;
    vars: CloudConnectorVars;
    name: string;
  } {
    const logger = this.getLogger('extractCloudVars');
    const vars = cloudConnector?.vars || {};
    const roleArn = vars.role_arn?.value || vars['aws.role_arn']?.value;

    if (!roleArn) {
      logger.error('AWS package policy must contain role_arn variable');
      throw new Error('AWS package policy must contain role_arn variable');
    }

    // Check for AWS variables
    if (roleArn) {
      let externalId: any;

      if (typeof vars.external_id?.value === 'object' && vars.external_id?.value?.isSecretRef) {
        externalId = vars.external_id.value;
      }

      if (
        typeof vars.aws?.credentials?.external_id?.value === 'object' &&
        vars.aws?.credentials.external_id.value.isSecretRef
      ) {
        externalId = vars.aws?.credentials.external_id.value;
      }

      if (!externalId) {
        logger.error('AWS package policy must contain external_id variable');
        throw new Error('AWS package policy must contain external_id variable');
      }

      return {
        cloudProvider: cloudConnector.cloudProvider as CloudProvider,
        vars: {
          role_arn: roleArn,
          external_id: externalId,
        },
        name: cloudConnector.name,
      };
    }

    logger.error('Package policy does not contain valid cloud provider variables');
    throw new Error(
      `Package policy must contain valid cloud provider variables (${
        cloudConnector.cloudProvider === 'aws'
          ? `role_arn  + external_id `
          : `client_id + tenant_id`
      }`
    );
  }
}

export const cloudConnectorService = new CloudConnectorService();
