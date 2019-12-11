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
import { ServerLibs, Datasource } from '../../libs/types';

export const registerDatasourceRoutes = (
  frameworkAdapter: HapiFrameworkAdapter,
  libs: ServerLibs
) => {
  frameworkAdapter.registerRoute(createGETDatasourceRoute(libs));
  frameworkAdapter.registerRoute(createGETDatasourcesRoute(libs));
  frameworkAdapter.registerRoute(createPOSTDatasourcesRoute(libs));
  frameworkAdapter.registerRoute(createPUTDatasourcesRoute(libs));
};

export const createGETDatasourceRoute = (libs: ServerLibs) => ({
  method: 'GET',
  path: '/api/ingest/datasources/{datasourceId}',
  config: {},
  handler: (async (
    request: FrameworkRequest<{ params: { datasourceId: string } }>
  ): Promise<ReturnTypeGet<any>> => {
    const datasource = await libs.datasources.get(request.user, request.params.datasourceId);

    return { item: datasource, success: true };
  }) as FrameworkRouteHandler,
});

export const createGETDatasourcesRoute = (libs: ServerLibs) => ({
  method: 'GET',
  path: '/api/ingest/datasources',
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
  handler: async (request: FrameworkRequest<any>): Promise<ReturnTypeList<Datasource>> => {
    // TODO fix for types that broke in TS 3.7
    const query: {
      page: string;
      perPage: string;
      kuery: string;
      showInactive: string;
    } = request.query as any;
    const { items, total, page, perPage } = await libs.datasources.list(request.user, {
      page: parseInt(query.page, 10),
      perPage: parseInt(query.perPage, 10),
      kuery: query.kuery,
    });

    return { list: items, success: true, total, page, perPage };
  },
});

export const createPOSTDatasourcesRoute = (libs: ServerLibs) => ({
  method: 'POST',
  path: '/api/ingest/datasources',
  config: {
    validate: {
      payload: {
        datasource: Joi.object().required(),
      },
    },
  },
  handler: (async (
    request: FrameworkRequest<{ payload: { datasource: any } }>
  ): Promise<ReturnTypeCreate<any>> => {
    if (!request.user || request.user.kind !== 'authenticated') {
      throw Boom.unauthorized('Only authenticated users can create a datasource');
    }
    const datasource = await libs.datasources.create(request.user, request.payload.datasource);

    return { item: datasource, success: true, action: 'created' };
  }) as FrameworkRouteHandler,
});

export const createPUTDatasourcesRoute = (libs: ServerLibs) => ({
  method: 'PUT',
  path: '/api/ingest/datasources/{datasourceId}',
  config: {
    validate: {
      payload: {
        datasource: Joi.object().required(),
      },
    },
  },
  handler: (async (
    request: FrameworkRequest<{
      params: { datasourceId: string };
      payload: { datasource: any };
    }>
  ): Promise<ReturnTypeUpdate<any>> => {
    if (!request.user || request.user.kind !== 'authenticated') {
      throw Boom.unauthorized('Only authenticated users can create a policy');
    }
    const datasource = await libs.datasources.update(
      request.user,
      request.params.datasourceId,
      request.payload.datasource
    );

    return { item: datasource, success: true, action: 'updated' };
  }) as FrameworkRouteHandler,
});
