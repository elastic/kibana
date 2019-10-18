/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import querystring from 'querystring';
import { API_BASE_URL } from '../../common/constants';
import { ServerFacade, RequestFacade } from '../../types';
import { getRouteConfigFactoryReportingPre } from './lib/route_config_factories';
import { HandlerErrorFunction, HandlerFunction } from './types';

const getStaticFeatureConfig = (getRouteConfig: any, featureId: any) =>
  getRouteConfig(() => featureId);
const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerLegacy(
  server: ServerFacade,
  handler: HandlerFunction,
  handleError: HandlerErrorFunction
) {
  const getRouteConfig = getRouteConfigFactoryReportingPre(server);

  function createLegacyPdfRoute({ path, objectType }: { path: string; objectType: any }) {
    const exportTypeId = 'printablePdf';
    server.route({
      path,
      method: 'POST',
      options: getStaticFeatureConfig(getRouteConfig, exportTypeId),
      handler: async (request: RequestFacade, h: Legacy.ResponseToolkit) => {
        const message = `The following URL is deprecated and will stop working in the next major version: ${request.url.path}`;
        server.log(['warning', 'reporting', 'deprecation'], message);

        try {
          const savedObjectId = request.params.savedId;
          const queryString = querystring.stringify(request.query);

          return await handler(
            exportTypeId,
            {
              objectType,
              savedObjectId,
              queryString,
            },
            request,
            h
          );
        } catch (err) {
          throw handleError(exportTypeId, err);
        }
      },
    });
  }

  createLegacyPdfRoute({
    path: `${BASE_GENERATE}/visualization/{savedId}`,
    objectType: 'visualization',
  });

  createLegacyPdfRoute({
    path: `${BASE_GENERATE}/search/{savedId}`,
    objectType: 'search',
  });

  createLegacyPdfRoute({
    path: `${BASE_GENERATE}/dashboard/{savedId}`,
    objectType: 'dashboard',
  });
}
