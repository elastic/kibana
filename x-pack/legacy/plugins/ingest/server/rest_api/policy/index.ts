/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import * as Joi from 'joi';
import {
  ReturnTypeCreate,
  ReturnTypeGet,
  ReturnTypeList,
} from '../../../common/types/std_return_format';
import {
  FrameworkRequest,
  FrameworkRouteHandler,
} from '../../libs/adapters/framework/adapter_types';
import { Policy } from '../../libs/adapters/policy/adapter_types';
import { ServerLibs } from '../../libs/types';

export const createGETPoliciyRoute = (libs: ServerLibs) => ({
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
