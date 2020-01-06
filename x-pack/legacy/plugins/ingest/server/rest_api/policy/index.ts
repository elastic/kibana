/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import * as Joi from 'joi';
import {
  ReturnTypeCreate,
  ReturnTypeUpdate,
  ReturnTypeGet,
  ReturnTypeList,
} from '../../../common/types/std_return_format';
import {
  FrameworkRequest,
  FrameworkRouteHandler,
} from '../../libs/adapters/framework/adapter_types';
import { HapiFrameworkAdapter } from '../../libs/adapters/framework/hapi_framework_adapter';
import { ServerLibs } from '../../libs/types';
import { Policy } from '../../../common/types/domain_data';

export const registerPolicyRoutes = (frameworkAdapter: HapiFrameworkAdapter, libs: ServerLibs) => {
  frameworkAdapter.registerRoute(createGETPolicyRoute(libs));
  frameworkAdapter.registerRoute(createGETPoliciesRoute(libs));
  frameworkAdapter.registerRoute(createPOSTPoliciesRoute(libs));
  frameworkAdapter.registerRoute(createPUTPoliciesRoute(libs));
  frameworkAdapter.registerRoute(createAddPolicyDatasourceRoute(libs));
  frameworkAdapter.registerRoute(createRemovePolicyDatasourceRoute(libs));
};

export const createGETPolicyRoute = (libs: ServerLibs) => ({
  method: 'GET',
  path: '/api/ingest/policies/{policyId}',
  config: {},
  handler: (async (
    request: FrameworkRequest<{ params: { policyId: string } }>
  ): Promise<ReturnTypeGet<any>> => {
    const policy = await libs.policy.get(request.user, request.params.policyId);

    return { item: policy, success: true };
  }) as FrameworkRouteHandler,
});

export const createGETPoliciesRoute = (libs: ServerLibs) => ({
  method: 'GET',
  path: '/api/ingest/policies',
  config: {
    validate: {
      query: {
        page: Joi.number().default(1),
        perPage: Joi.number().default(20),
        kuery: Joi.string()
          .trim()
          .optional(),
      },
    },
  },
  handler: async (request: FrameworkRequest<any>): Promise<ReturnTypeList<Policy>> => {
    // TODO fix for types that broke in TS 3.7
    const query: {
      page: string;
      perPage: string;
      kuery: string;
      showInactive: string;
    } = request.query as any;
    const { items, total, page, perPage } = await libs.policy.list(request.user, {
      page: parseInt(query.page, 10),
      perPage: parseInt(query.perPage, 10),
      kuery: query.kuery,
      withDatasources: true,
    });

    return { list: items, success: true, total, page, perPage };
  },
});

export const createPOSTPoliciesRoute = (libs: ServerLibs) => ({
  method: 'POST',
  path: '/api/ingest/policies',
  config: {
    validate: {
      payload: {
        name: Joi.string().required(),
        description: Joi.string().optional(),
      },
    },
  },
  handler: (async (
    request: FrameworkRequest<{ payload: { name: string; description?: string } }>
  ): Promise<ReturnTypeCreate<any>> => {
    if (!request.user || request.user.kind !== 'authenticated') {
      throw Boom.unauthorized('Only authenticated users can create a policy');
    }
    const policy = await libs.policy.create(
      request.user,
      request.payload.name,
      request.payload.description
    );

    return { item: policy, success: true, action: 'created' };
  }) as FrameworkRouteHandler,
});

export const createPUTPoliciesRoute = (libs: ServerLibs) => ({
  method: 'PUT',
  path: '/api/ingest/policies/{policyId}',
  config: {
    validate: {
      payload: {
        name: Joi.string().required(),
        description: Joi.string().optional(),
      },
    },
  },
  handler: (async (
    request: FrameworkRequest<{
      params: { policyId: string };
      payload: { name: string; description?: string };
    }>
  ): Promise<ReturnTypeUpdate<any>> => {
    if (!request.user || request.user.kind !== 'authenticated') {
      throw Boom.unauthorized('Only authenticated users can create a policy');
    }
    const policy = await libs.policy.update(request.user, request.params.policyId, {
      name: request.payload.name,
      description: request.payload.description,
    });

    return { item: policy, success: true, action: 'updated' };
  }) as FrameworkRouteHandler,
});

export const createAddPolicyDatasourceRoute = (libs: ServerLibs) => ({
  method: 'POST',
  path: '/api/ingest/policies/{policyId}/addDatasources',
  config: {
    validate: {
      payload: {
        datasources: Joi.array()
          .items(Joi.string())
          .required(),
      },
    },
  },
  handler: (async (
    request: FrameworkRequest<{
      params: { policyId: string };
      payload: { datasources: string[] };
    }>
  ): Promise<ReturnTypeUpdate<any>> => {
    if (!request.user || request.user.kind !== 'authenticated') {
      throw Boom.unauthorized('Only authenticated users can create a policy');
    }
    const policy = await libs.policy.assignDatasource(
      request.user,
      request.params.policyId,
      request.payload.datasources
    );

    return { item: policy, success: true, action: 'updated' };
  }) as FrameworkRouteHandler,
});

export const createRemovePolicyDatasourceRoute = (libs: ServerLibs) => ({
  method: 'POST',
  path: '/api/ingest/policies/{policyId}/removeDatasources',
  config: {
    validate: {
      payload: {
        datasources: Joi.array()
          .items(Joi.string())
          .required(),
      },
    },
  },
  handler: (async (
    request: FrameworkRequest<{
      params: { policyId: string };
      payload: { datasources: string[] };
    }>
  ): Promise<ReturnTypeUpdate<any>> => {
    if (!request.user || request.user.kind !== 'authenticated') {
      throw Boom.unauthorized('Only authenticated users can create a policy');
    }
    const policy = await libs.policy.unassignDatasource(
      request.user,
      request.params.policyId,
      request.payload.datasources
    );

    return { item: policy, success: true, action: 'updated' };
  }) as FrameworkRouteHandler,
});
