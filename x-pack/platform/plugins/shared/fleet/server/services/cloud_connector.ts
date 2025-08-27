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
} from '../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes } from '../types/so_attributes';
import type { CreateCloudConnectorRequest } from '../routes/cloud_connector/handlers';
import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../common/constants';
import {
  AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME,
  AWS_ROLE_ARN_VAR_NAME,
} from '../../common/constants/cloud_connector';

import { CloudConnectorCreateError, CloudConnectorGetListError } from '../errors';

import { appContextService } from './app_context';

export interface CloudConnectorServiceInterface {
  create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest
  ): Promise<CloudConnectorSO>;
  getList(
    soClient: SavedObjectsClientContract,
    options?: CloudConnectorListOptions
  ): Promise<CloudConnectorSO[]>;
}

export class CloudConnectorService implements CloudConnectorServiceInterface {
  private static readonly EXTERNAL_ID_REGEX = /^[a-zA-Z0-9]{20}$/;

  protected getLogger(...childContextPaths: string[]): Logger {
    return appContextService.getLogger().get('CloudConnectorService', ...childContextPaths);
  }

  async create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest
  ): Promise<CloudConnectorSO> {
    const logger = this.getLogger('create');

    try {
      logger.info('Creating cloud connector');

      const { name, cloudProvider, vars } = this.getCloudConnectorInfo(cloudConnector);

      if (!vars || Object.keys(vars).length === 0) {
        logger.error(`Package policy must contain ${cloudProvider} input vars`);
        throw new CloudConnectorCreateError(
          `CloudConnectorService Package policy must contain ${cloudProvider} input vars`
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
      throw new CloudConnectorCreateError(
        `CloudConnectorService Failed to create cloud connector: ${error.message}\n${error.stack}`
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
      throw new CloudConnectorGetListError(
        `Failed to get cloud connectors list: ${error.message}\n${error.stack}`
      );
    }
  }

  private getCloudConnectorInfo(cloudConnector: CreateCloudConnectorRequest): {
    cloudProvider: CloudProvider;
    vars: CloudConnectorVars;
    name: string;
  } {
    const logger = this.getLogger('extracting cloud input vars.');
    const vars = cloudConnector.vars;
    let name = cloudConnector.name;

    if (cloudConnector.cloudProvider === 'aws') {
      const roleArnVar = typeof vars.role_arn === 'string' ? vars.role_arn : vars.role_arn?.value;
      const awsRoleArnVar =
        typeof vars[AWS_ROLE_ARN_VAR_NAME] === 'string'
          ? vars[AWS_ROLE_ARN_VAR_NAME]
          : vars[AWS_ROLE_ARN_VAR_NAME]?.value;
      const roleArn: string = roleArnVar || awsRoleArnVar;

      if (!roleArn) {
        logger.error('AWS package policy must contain role_arn variable');
        throw new Error('AWS package policy must contain role_arn variable');
      }

      // Check for AWS variables
      if (roleArn) {
        let externalId: CloudConnectorSecretVar | undefined;
        name = roleArn;

        if (vars.external_id || vars[AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME]) {
          const externalIdSecretReference: string =
            vars.external_id?.value?.id || vars[AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME].value?.id;
          const isSecretRef =
            vars.external_id?.value?.isSecretRef ||
            vars[AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME].value?.isSecretRef;

          if (externalIdSecretReference && isSecretRef) {
            const isValid = CloudConnectorService.EXTERNAL_ID_REGEX.test(externalIdSecretReference);
            if (!isValid) {
              logger.error('External ID secret reference must be a valid secret reference');
              throw new Error('External ID secret reference is not valid');
            }

            externalId = vars.external_id?.value?.isSecretRef
              ? vars.external_id
              : vars[AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME];
          }
        }

        if (!externalId) {
          logger.error('AWS package policy must contain valid external_id secret reference');
          throw new Error('AWS package policy must contain valid external_id secret reference');
        }

        return {
          name,
          cloudProvider: cloudConnector.cloudProvider,
          vars: {
            role_arn: roleArn,
            external_id: externalId,
          },
        };
      }
    }

    logger.error(`Unsupported cloud provider: ${cloudConnector.cloudProvider}`);
    throw new CloudConnectorGetListError(
      `Unsupported cloud provider: ${cloudConnector.cloudProvider}`
    );
  }
}

export const cloudConnectorService = new CloudConnectorService();
