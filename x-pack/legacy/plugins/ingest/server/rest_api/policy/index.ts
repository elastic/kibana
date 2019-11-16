/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import Boom from 'boom';
import {
  FrameworkRequest,
  FrameworkRouteHandler,
} from '../../libs/adapters/framework/adapter_types';
import {
  ReturnTypeList,
  ReturnTypeCreate,
  ReturnTypeGet,
} from '../../../common/types/std_return_format';
import { ServerLibs } from '../../libs/types';

export const createGETPoliciyRoute = (libs: ServerLibs) => ({
  method: 'GET',
  path: '/api/ingest/policies/{policyId}',
  config: {},
  handler: (async (
    request: FrameworkRequest<{ params: { policyId: string } }>
  ): Promise<ReturnTypeGet<any>> => {
    const policy = await libs.policy.get(request.params.policyId);

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
      },
    },
  },
  handler: (async (
    request: FrameworkRequest<{ query: { page: string } }>
  ): Promise<ReturnTypeList<any>> => {
    const page = parseInt(request.query.page, 10);
    const { items, total } = await libs.policy.list(page, 100);

    return { list: items, success: true, page, total };
  }) as FrameworkRouteHandler,
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
