/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';

import { CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE } from '../../common/constants';
import type {
  CloudOnboardingDeployment,
  CreateCloudOnboardingDeploymentInput,
  UpdateCloudOnboardingDeploymentInput,
  CloudOnboardingDeploymentStatus,
} from '../../common/types/models/cloud_onboarding_deployment';
import type { CloudOnboardingDeploymentSOAttributes } from '../types/so_attributes';
import { FleetError } from '../errors';
import { SO_SEARCH_LIMIT } from '../../common';

import { appContextService } from './app_context';

function soToDeployment(
  id: string,
  attributes: CloudOnboardingDeploymentSOAttributes
): CloudOnboardingDeployment {
  return {
    id,
    provider: attributes.provider as CloudOnboardingDeployment['provider'],
    connectionId: attributes.connectionId,
    mechanisms: attributes.mechanisms as CloudOnboardingDeployment['mechanisms'],
    deploymentId: attributes.deploymentId,
    deploymentName: attributes.deploymentName,
    services: attributes.services,
    status: attributes.status as CloudOnboardingDeploymentStatus,
    statusMessage: attributes.statusMessage,
    attemptCount: attributes.attemptCount,
    vars: attributes.vars,
    serviceVars: attributes.serviceVars,
    packagePolicyIds: attributes.packagePolicyIds,
    createdAt: attributes.createdAt,
    updatedAt: attributes.updatedAt,
  };
}

class CloudOnboardingDeploymentService {
  private get encryptedSoClient() {
    return appContextService.getEncryptedSavedObjects();
  }

  public async create(
    soClient: SavedObjectsClientContract,
    input: CreateCloudOnboardingDeploymentInput
  ): Promise<CloudOnboardingDeployment> {
    const now = new Date().toISOString();
    const attributes: CloudOnboardingDeploymentSOAttributes = {
      ...input,
      mechanisms: input.mechanisms as string[],
      status: 'pending',
      attemptCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    const so = await soClient.create<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      attributes
    );

    if (so.error) {
      throw new FleetError(so.error.message);
    }

    return soToDeployment(so.id, so.attributes);
  }

  public async getById(id: string): Promise<CloudOnboardingDeployment> {
    const so =
      await this.encryptedSoClient.getDecryptedAsInternalUser<CloudOnboardingDeploymentSOAttributes>(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        id
      );

    if (so.error) {
      throw new FleetError(so.error.message);
    }

    return soToDeployment(so.id, so.attributes);
  }

  public async getByConnectionId(connectionId: string): Promise<CloudOnboardingDeployment[]> {
    const finder =
      await this.encryptedSoClient.createPointInTimeFinderDecryptedAsInternalUser<CloudOnboardingDeploymentSOAttributes>(
        {
          type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          filter: nodeBuilder.is(
            `${CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE}.attributes.connectionId`,
            connectionId
          ),
          perPage: SO_SEARCH_LIMIT,
        }
      );

    const deployments: CloudOnboardingDeployment[] = [];
    try {
      for await (const result of finder.find()) {
        for (const so of result.saved_objects) {
          deployments.push(soToDeployment(so.id, so.attributes));
        }
      }
    } finally {
      await finder.close();
    }
    return deployments;
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    update: UpdateCloudOnboardingDeploymentInput
  ): Promise<CloudOnboardingDeployment> {
    const now = new Date().toISOString();
    await soClient.update<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      id,
      { ...update, mechanisms: update.mechanisms as string[] | undefined, updatedAt: now }
    );

    return this.getById(id);
  }

  public async updateStatus(
    soClient: SavedObjectsClientContract,
    id: string,
    status: CloudOnboardingDeploymentStatus,
    statusMessage?: string
  ): Promise<CloudOnboardingDeployment> {
    return this.update(soClient, id, { status, statusMessage });
  }

  public async delete(soClient: SavedObjectsClientContract, id: string): Promise<void> {
    await soClient.delete(CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE, id);
  }
}

export const cloudOnboardingDeploymentService = new CloudOnboardingDeploymentService();
