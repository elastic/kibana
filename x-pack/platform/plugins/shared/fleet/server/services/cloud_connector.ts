/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
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
    return appContextService.getLogger().get('CloudConnectorService', ...childContextPaths);
  }

  async create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest,
    packagePolicy?: PackagePolicy
  ): Promise<CloudConnectorSO> {
    const logger = this.getLogger('create');
    logger.debug('Creating cloud connector');

    try {
      const templateName = packagePolicy?.inputs?.[0]?.policy_template || 'unknown';
      logger.info(
        `Creating cloud connector for integration package: ${packagePolicy?.package?.name} package policy id ${packagePolicy?.id}, template: ${templateName}`
      );

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

      logger.info(
        `Successfully created cloud connector for integration package: ${packagePolicy?.package?.name} package policy id ${packagePolicy?.id}, template: ${templateName}`
      );

      return {
        id: savedObject.id,
        name: savedObject.attributes.name,
        attributes: {
          cloudProvider: savedObject.attributes.cloudProvider,
          vars: savedObject.attributes.vars,
          packagePolicyCount: savedObject.attributes.packagePolicyCount,
        },
      };
    } catch (error) {
      const templateName = packagePolicy?.inputs?.[0]?.policy_template || 'unknown';
      logger.error(
        `Failed to create cloud connector for package: ${packagePolicy?.package?.name}, template: ${templateName}`,
        error.message
      );
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
        attributes: {
          cloudProvider: so.attributes.cloudProvider,
          vars: so.attributes.vars,
          packagePolicyCount: so.attributes.packagePolicyCount,
        },
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
    const templateName = packagePolicy?.inputs?.[0]?.policy_template || 'unknown';
    const roleArn = vars.role_arn?.value || vars['aws.role_arn']?.value;

    // Check for AWS variables
    if (vars.role_arn?.value || vars['aws.role_arn']?.value) {
      let externalId: any;

      if (vars.external_id?.value) {
        // Check if it's already a secret reference
        if (typeof vars.external_id.value === 'object' && vars.external_id.value.isSecretRef) {
          externalId = vars.external_id.value;
        } else {
          // Convert to secret reference format
          externalId = {
            isSecretRef: true,
            id: vars.external_id.value,
          };
        }
      } else if (vars.aws) {
        const awsVars = vars.aws as any;
        if (awsVars.credentials?.external_id?.value) {
          if (
            typeof awsVars.credentials.external_id.value === 'object' &&
            awsVars.credentials.external_id.value.isSecretRef
          ) {
            externalId = awsVars.credentials.external_id.value;
          } else {
            externalId = {
              isSecretRef: true,
              id: awsVars.credentials.external_id.value,
            };
          }
        }
      }

      if (!externalId) {
        logger.error(
          `AWS package policy must contain external_id variable. Package Policy ID: ${packagePolicy?.id}, Name: ${packagePolicy?.name}, Template: ${templateName}`
        );
        throw new Error('AWS package policy must contain external_id variable');
      }

      return {
        cloudProvider: cloudConnector.cloudProvider as CloudProvider,
        vars: {
          role_arn: roleArn,
          'aws.role_arn': roleArn,
          'aws.credentials.external_id': {
            type: vars.external_id?.type || 'secret',
            value: externalId,
            frozen: vars.external_id?.frozen || false,
          },
          external_id: {
            type: vars.external_id?.type || 'secret',
            value: externalId,
            frozen: vars.external_id?.frozen || false,
          },
        },
        name: cloudConnector.name,
      };
    }

    // Check for Azure variables
    if (vars.client_id?.value && vars.tenant_id?.value) {
      const uuid = uuidv4();

      return {
        cloudProvider: cloudConnector.cloudProvider as CloudProvider,
        vars: {
          client_id: vars.client_id,
          tenant_id: vars.tenant_id,
        },
        name: `azure-connector-${packagePolicy?.name || 'unknown'}-${uuid}`,
      };
    }

    logger.error(
      `Package policy does not contain valid cloud provider variables. Package Policy ID: ${
        packagePolicy?.id
      }, Name: ${packagePolicy?.package?.name}, Version: ${
        packagePolicy?.package?.version
      }, Template: ${templateName}, Available vars: ${Object.keys(vars).join(', ')}`
    );
    throw new Error(
      'Package policy must contain valid cloud provider variables (AWS: role_arn + external_id, Azure: client_id + tenant_id)'
    );
  }
}

export const cloudConnectorService = new CloudConnectorService();
