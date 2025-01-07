/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
import {
  ClientRequestParamsOf,
  RouteRepositoryClient,
  createRepositoryClient,
  isHttpFetchError,
} from '@kbn/server-route-repository-client';
import { type KueryNode, nodeTypes, toKqlExpression } from '@kbn/es-query';
import type { EntityDefinition } from '@kbn/entities-schema';
import type { EntityDefinitionWithState } from '../../server/lib/entities/types';
import {
  DisableManagedEntityResponse,
  EnableManagedEntityResponse,
  ManagedEntityEnabledResponse,
} from '../../common/types_api';
import type { EntityManagerRouteRepository } from '../../server';
import { EntityManagerUnauthorizedError } from './errors';

type EntityManagerRepositoryClient = RouteRepositoryClient<EntityManagerRouteRepository, {}>;

type QueryParamOf<T extends { params?: any }> = Exclude<T['params'], undefined>['query'];

type DeleteEntityDefinitionQuery = QueryParamOf<
  ClientRequestParamsOf<
    EntityManagerRouteRepository,
    'DELETE /internal/entities/managed/enablement'
  >
>;

type CreateEntityDefinitionQuery = QueryParamOf<
  ClientRequestParamsOf<EntityManagerRouteRepository, 'PUT /internal/entities/managed/enablement'>
>;

export class EntityClient {
  public readonly repositoryClient: EntityManagerRepositoryClient['fetch'];

  constructor(core: CoreStart | CoreSetup) {
    this.repositoryClient = createRepositoryClient<EntityManagerRouteRepository>(core).fetch;
  }

  async isManagedEntityDiscoveryEnabled(): Promise<ManagedEntityEnabledResponse> {
    return await this.repositoryClient('GET /internal/entities/managed/enablement');
  }

  async enableManagedEntityDiscovery(
    query?: CreateEntityDefinitionQuery
  ): Promise<EnableManagedEntityResponse> {
    try {
      return await this.repositoryClient('PUT /internal/entities/managed/enablement', {
        params: {
          query: {
            installOnly: query?.installOnly,
          },
        },
      });
    } catch (err) {
      if (isHttpFetchError(err) && err.body?.statusCode === 403) {
        throw new EntityManagerUnauthorizedError(err.body.message);
      }
      throw err;
    }
  }

  async disableManagedEntityDiscovery(
    query?: DeleteEntityDefinitionQuery
  ): Promise<DisableManagedEntityResponse> {
    try {
      return await this.repositoryClient('DELETE /internal/entities/managed/enablement', {
        params: {
          query: {
            deleteData: query?.deleteData,
          },
        },
      });
    } catch (err) {
      if (isHttpFetchError(err) && err.body?.statusCode === 403) {
        throw new EntityManagerUnauthorizedError(err.body.message);
      }
      throw err;
    }
  }

  async getEntityDefinition(
    id: string
  ): Promise<{ definitions: EntityDefinition[] | EntityDefinitionWithState[] }> {
    try {
      return await this.repositoryClient('GET /internal/entities/definition/{id?}', {
        params: {
          path: { id },
          query: { page: 1, perPage: 1 },
        },
      });
    } catch (err) {
      if (isHttpFetchError(err) && err.body?.statusCode === 403) {
        throw new EntityManagerUnauthorizedError(err.body.message);
      }
      throw err;
    }
  }

  asKqlFilter({
    entity,
  }: {
    entity: { [key: string]: any } & { entityIdentityFields: { [key: string]: string[] } };
  }) {
    const identityFieldsValue = this.getIdentityFieldsValue({ entity });

    const nodes: KueryNode[] = Object.entries(identityFieldsValue).map(([identityField, value]) => {
      return nodeTypes.function.buildNode('is', identityField, `"${value}"`);
    });

    if (nodes.length === 0) return '';

    const kqlExpression = nodes.length > 1 ? nodeTypes.function.buildNode('and', nodes) : nodes[0];

    return toKqlExpression(kqlExpression);
  }

  getIdentityFieldsValue({
    entity,
  }: {
    entity: { [key: string]: any } & { entityIdentityFields: { [key: string]: string[] } };
  }): Record<string, any> {
    const { entityIdentityFields: identityFields } = entity;
    if (!Object.keys(identityFields || {}).length) {
      throw new Error('Identity fields are missing');
    }

    return Object.values(identityFields).reduce((acc: Record<string, any>, fields) => {
      fields.forEach((field) => {
        if (entity?.[field]) {
          acc[field] = entity[field];
        }
      });
      return acc;
    }, {} as Record<string, string>);
  }
}
