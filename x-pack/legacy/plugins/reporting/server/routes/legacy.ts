/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import querystring from 'querystring';
import { API_BASE_URL } from '../../common/constants';
import { ReportingSetupDeps, ServerFacade } from '../types';
import {
  getRouteConfigFactoryReportingPre,
  GetRouteConfigFactoryFn,
} from './lib/route_config_factories';
import { HandlerErrorFunction, HandlerFunction } from './types';
import { ReportingCore } from '../core';
import { LevelLogger } from '../lib';

const getStaticFeatureConfig = (getRouteConfig: GetRouteConfigFactoryFn, featureId: string) =>
  getRouteConfig(() => featureId);

const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerLegacy(
  reporting: ReportingCore,
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  handler: HandlerFunction,
  handleError: HandlerErrorFunction,
  logger: LevelLogger
) {
  const config = reporting.getConfig();
  const getRouteConfig = getRouteConfigFactoryReportingPre(config, plugins, logger);

  function createLegacyPdfRoute({ path, objectType }: { path: string; objectType: string }) {
    const exportTypeId = 'printablePdf';
    server.route({
      path,
      method: 'POST',
      options: getStaticFeatureConfig(getRouteConfig, exportTypeId),
      handler: async (request: Legacy.Request, h: Legacy.ResponseToolkit) => {
        const message = `The following URL is deprecated and will stop working in the next major version: ${request.url.path}`;
        logger.warn(message, ['deprecation']);

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
