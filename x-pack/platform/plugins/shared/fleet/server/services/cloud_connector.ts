/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type {
  CloudConnectorResponse,
  CloudConnectorListOptions,
  CloudConnectorSecretReference,
} from '../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes } from '../types/so_attributes';
import type { CreateCloudConnectorRequest } from '../routes/cloud_connector/handlers';
import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../common/constants';

import {
  CloudConnectorCreateError,
  CloudConnectorGetListError,
  CloudConnectorInvalidVarsError,
} from '../errors';

import { appContextService } from './app_context';

export interface CloudConnectorServiceInterface {
  create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest
  ): Promise<CloudConnectorResponse>;
  getList(
    soClient: SavedObjectsClientContract,
    options?: CloudConnectorListOptions
  ): Promise<CloudConnectorResponse[]>;
}

export class CloudConnectorService implements CloudConnectorServiceInterface {
  private static readonly EXTERNAL_ID_REGEX = /^[a-zA-Z0-9_-]{20}$/;

  protected getLogger(...childContextPaths: string[]): Logger {
    return appContextService.getLogger().get('CloudConnectorService', ...childContextPaths);
  }

  async create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest
  ): Promise<CloudConnectorResponse> {
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
      const name =
        cloudConnector.cloudProvider === 'aws' && vars.role_arn?.value
          ? vars.role_arn.value
          : cloudConnector.name;

      // Check if space awareness is enabled for namespace handling
      const { isSpaceAwarenessEnabled } = await import('./spaces/helpers');
      const useSpaceAwareness = await isSpaceAwarenessEnabled();
      const namespace = useSpaceAwareness ? '*' : undefined;

      // Create cloud connector saved object
      const cloudConnectorAttributes: CloudConnectorSOAttributes = {
        name,
        namespace,
        cloudProvider,
        vars: {
          ...(vars.role_arn?.value && { role_arn: vars.role_arn }),
          ...(vars.external_id?.value && { external_id: vars.external_id }),
        },
        packagePolicyCount: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const savedObject = await soClient.create<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorAttributes,
        { namespace }
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
        namespace: savedObject.attributes.namespace,
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
  ): Promise<CloudConnectorResponse[]> {
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
        namespace: so.attributes.namespace,
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

  private validateCloudConnectorDetails(cloudConnector: CreateCloudConnectorRequest) {
    const logger = this.getLogger('validate cloud connector details');
    const vars = cloudConnector.vars;

    if (cloudConnector.cloudProvider === 'aws') {
      const roleArn = vars.role_arn?.value;

      if (!roleArn) {
        logger.error('Package policy must contain role_arn variable');
        throw new CloudConnectorInvalidVarsError('Package policy must contain role_arn variable');
      }
      const externalId: CloudConnectorSecretReference | undefined = vars.external_id?.value;

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
    } else {
      logger.error(`Unsupported cloud provider: ${cloudConnector.cloudProvider}`);
      throw new CloudConnectorCreateError(
        `Unsupported cloud provider: ${cloudConnector.cloudProvider}`
      );
    }
  }
}

export const cloudConnectorService = new CloudConnectorService();
