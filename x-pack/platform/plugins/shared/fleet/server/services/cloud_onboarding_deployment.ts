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
} from '../../common/types/models/cloud_onboarding_deployment';
import type { CloudOnboardingDeploymentSOAttributes } from '../types/so_attributes';
import { FleetError } from '../errors';

import { appContextService } from './app_context';

const CLOUD_ONBOARDING_DEPLOYMENT_LIMIT = 100;

class CloudOnboardingDeploymentService {
  private get encryptedSoClient() {
    return appContextService.getEncryptedSavedObjects();
  }

  public async create(
    soClient: SavedObjectsClientContract,
    input: CreateCloudOnboardingDeploymentInput
  ): Promise<CloudOnboardingDeployment> {
    const attributes: CloudOnboardingDeploymentSOAttributes = {
      ...input,
      mechanisms: input.mechanisms,
      status: 'pending',
      attemptCount: 1,
    };

    const so = await soClient.create<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      attributes
    );

    if (so.error) {
      throw new FleetError(so.error.message);
    }

    return { id: so.id, ...so.attributes };
  }

  public async getById(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<CloudOnboardingDeployment> {
    const so =
      await this.encryptedSoClient.getDecryptedAsInternalUser<CloudOnboardingDeploymentSOAttributes>(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        id,
        { namespace: soClient.getCurrentNamespace() }
      );

    if (so.error) {
      throw new FleetError(so.error.message);
    }

    return { id: so.id, ...so.attributes };
  }

  public async getByConnectorId(
    soClient: SavedObjectsClientContract,
    connectorId: string
  ): Promise<CloudOnboardingDeployment[]> {
    const finder = soClient.createPointInTimeFinder<CloudOnboardingDeploymentSOAttributes>({
      type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      filter: nodeBuilder.is(
        `${CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE}.attributes.connectorId`,
        connectorId
      ),
      perPage: CLOUD_ONBOARDING_DEPLOYMENT_LIMIT,
    });

    const deployments: CloudOnboardingDeployment[] = [];
    try {
      for await (const result of finder.find()) {
        for (const so of result.saved_objects) {
          deployments.push({ id: so.id, ...so.attributes });
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
    await soClient.update<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      id,
      { ...update }
    );

    return this.getById(soClient, id);
  }

  public async delete(soClient: SavedObjectsClientContract, id: string): Promise<void> {
    await soClient.delete(CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE, id);
  }
}

export const cloudOnboardingDeploymentService = new CloudOnboardingDeploymentService();
