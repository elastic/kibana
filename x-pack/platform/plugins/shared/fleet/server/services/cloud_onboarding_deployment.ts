/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type {
  CloudOnboardingDeployment,
  CreateCloudOnboardingDeploymentInput,
  UpdateCloudOnboardingDeploymentInput,
} from '../../common/types/models/cloud_onboarding_deployment';
import type { CloudOnboardingDeploymentSOAttributes } from '../types/so_attributes';

const CLOUD_ONBOARDING_DEPLOYMENT_LIMIT = 100;

const toDeployment = (
  so: SavedObject<CloudOnboardingDeploymentSOAttributes>
): CloudOnboardingDeployment => ({
  id: so.id,
  ...so.attributes,
  ...(so.updated_at ? { updatedAt: so.updated_at } : {}),
});

export interface ListCloudOnboardingDeploymentsOptions {
  packageName?: string;
  provider?: string;
  page?: number;
  perPage?: number;
}

class CloudOnboardingDeploymentService {
  public async create(
    soClient: SavedObjectsClientContract,
    input: CreateCloudOnboardingDeploymentInput,
    updatedBy?: string
  ): Promise<CloudOnboardingDeployment> {
    // Validates connectorId exists in the same space; throws SavedObjectsErrorHelpers not-found if not.
    if (input.connectorId) {
      await soClient.get(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, input.connectorId);
    }

    const attributes: CloudOnboardingDeploymentSOAttributes = {
      ...input,
      status: 'pending',
      attemptCount: 1,
      ...(updatedBy ? { updatedBy } : {}),
    };

    const so = await soClient.create<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      attributes
    );

    return toDeployment(so);
  }

  public async getById(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<CloudOnboardingDeployment> {
    const so = await soClient.get<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      id
    );

    return toDeployment(so);
  }

  public async list(
    soClient: SavedObjectsClientContract,
    { packageName, provider, page = 1, perPage = 20 }: ListCloudOnboardingDeploymentsOptions = {}
  ): Promise<{
    items: CloudOnboardingDeployment[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const attributePath = (name: string) =>
      `${CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE}.attributes.${name}`;
    const filters = [
      ...(packageName ? [nodeBuilder.is(attributePath('packageNames'), packageName)] : []),
      ...(provider ? [nodeBuilder.is(attributePath('provider'), provider)] : []),
    ];

    const result = await soClient.find<CloudOnboardingDeploymentSOAttributes>({
      type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      ...(filters.length ? { filter: nodeBuilder.and(filters) } : {}),
      sortField: 'updated_at',
      sortOrder: 'desc',
      page,
      perPage,
    });

    return {
      items: result.saved_objects.map(toDeployment),
      total: result.total,
      page,
      perPage,
    };
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
      outer: for await (const result of finder.find()) {
        for (const so of result.saved_objects) {
          deployments.push(toDeployment(so));
          if (deployments.length >= CLOUD_ONBOARDING_DEPLOYMENT_LIMIT) {
            break outer;
          }
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
    update: UpdateCloudOnboardingDeploymentInput,
    updatedBy?: string
  ): Promise<CloudOnboardingDeployment> {
    // soClient.update sends a partial ES doc update. ES deep-merges nested objects, so keys
    // removed from record fields like policyIdsByInstance or serviceVars would persist in the
    // stored document. Use get + create(overwrite) for a full-replace write instead.
    const existing = await soClient.get<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      id
    );
    // A null description or namespace clears it. The saved object schema has no null for them, so
    // the key is removed rather than stored.
    const { description, namespace, ...rest } = update;
    const attributes: CloudOnboardingDeploymentSOAttributes = {
      ...existing.attributes,
      ...rest,
      ...(description ? { description } : {}),
      ...(namespace ? { namespace } : {}),
      ...(updatedBy ? { updatedBy } : {}),
    };
    if (description === null || description === '') delete attributes.description;
    if (namespace === null || namespace === '') delete attributes.namespace;
    await soClient.create<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      attributes,
      { id, overwrite: true, references: existing.references }
    );

    return this.getById(soClient, id);
  }

  public async delete(soClient: SavedObjectsClientContract, id: string): Promise<void> {
    await soClient.delete(CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE, id);
  }
}

export const cloudOnboardingDeploymentService = new CloudOnboardingDeploymentService();
