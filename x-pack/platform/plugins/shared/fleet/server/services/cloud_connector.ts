/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type {
  CloudConnectorSO,
  CloudConnectorListOptions,
  CloudProvider,
  CloudConnectorVars,
  CloudConnectorSecretVar,
  CloudConnectorServiceInterface,
} from '../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes } from '../types/so_attributes';
import type { CreateCloudConnectorRequest } from '../routes/cloud_connector/handlers';
import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../common/constants';

import { appContextService } from './app_context';

export class CloudConnectorService implements CloudConnectorServiceInterface {
  private static readonly EXTERNAL_ID_REGEX = /^[a-zA-Z0-9]{20}$/;

  protected getLogger(...childContextPaths: string[]): Logger {
    return appContextService
      .getLogger()
      .get('[Cloud Connector API] CloudConnectorService', ...childContextPaths);
  }

  async create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest
  ): Promise<CloudConnectorSO> {
    const logger = this.getLogger('create');
    logger.debug('Creating cloud connector');

    try {
      logger.info('Creating cloud connector');

      // Extract cloud variables from package policy
      const { cloudProvider, vars, name } = this.extractCloudVars(cloudConnector);

      if (!vars || Object.keys(vars).length === 0) {
        logger.error(`Package policy must contain ${cloudProvider} input vars`);
        throw new Error(
          `[Cloud Connector API] Package policy must contain ${cloudProvider} input vars`
        );
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
      throw new Error(
        `[Cloud Connector API] Failed to create cloud connector: ${error.message}\n${error.stack}`
      );
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
      logger.error('Failed to get cloud connectors list', error.message);
      throw new Error(
        `[Cloud Connector API] Failed to get cloud connectors list: ${error.message}\n${error.stack}`
      );
    }
  }

  private extractCloudVars(cloudConnector: CreateCloudConnectorRequest): {
    cloudProvider: CloudProvider;
    vars: CloudConnectorVars;
    name: string;
  } {
    const logger = this.getLogger('extracting cloud input vars.');
    const vars = cloudConnector.vars;

    if (cloudConnector.cloudProvider === 'aws') {
      const roleArn = vars.role_arn?.value || vars['aws.role_arn']?.value;

      if (!roleArn) {
        logger.error('AWS package policy must contain role_arn variable');
        throw new Error('[Cloud Connector API] AWS package policy must contain role_arn variable');
      }

      // Check for AWS variables
      if (roleArn) {
        let externalId: CloudConnectorSecretVar | undefined;

        // Combined validation for external ID secret
        const externalIdSecret =
          vars.external_id?.value?.id || vars.aws?.credentials.external_id?.value?.id;
        const isSecretRef =
          vars.external_id?.value?.isSecretRef ||
          vars.aws?.credentials.external_id?.value?.isSecretRef;

        if (externalIdSecret && isSecretRef) {
          const isValid = CloudConnectorService.EXTERNAL_ID_REGEX.test(externalIdSecret);
          if (!isValid) {
            logger.error('External ID secret must be a 20-character alphanumeric string');
            throw new Error('[Cloud Connector API] External ID input var is not valid');
          }

          externalId = vars.external_id?.value?.isSecretRef
            ? vars.external_id
            : vars.aws?.credentials.external_id;
        }

        if (!externalId) {
          logger.error('AWS package policy must contain valid external_id secret input var');
          throw new Error(
            '[Cloud Connector API] AWS package policy must contain valid external_id secret input var'
          );
        }

        return {
          cloudProvider: cloudConnector.cloudProvider,
          vars: {
            role_arn: roleArn,
            external_id: externalId,
          },
          name: cloudConnector.name,
        };
      }
    }

    logger.error(`Unsupported cloud provider: ${cloudConnector.cloudProvider}`);
    throw new Error(
      `[Cloud Connector API] Unsupported cloud provider: ${cloudConnector.cloudProvider}`
    );
  }
}

export const cloudConnectorService = new CloudConnectorService();
