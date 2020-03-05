/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../common/constants';
import { Logger, ServerFacade } from '../../../types';
import { ReportingSetupDeps } from '../../types';
import { authorizedUserPreRoutingFactory } from './authorized_user_pre_routing';
import {
  GetReportingFeatureIdFn,
  reportingFeaturePreRoutingFactory,
} from './reporting_feature_pre_routing';

const API_TAG = 'api';

export interface RouteConfigFactory {
  tags?: string[];
  pre: any[];
  response?: {
    ranges: boolean;
  };
}

export type GetRouteConfigFactoryFn = (
  getFeatureId?: GetReportingFeatureIdFn
) => RouteConfigFactory;

export function getRouteConfigFactoryReportingPre(
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  logger: Logger
): GetRouteConfigFactoryFn {
  const authorizedUserPreRouting = authorizedUserPreRoutingFactory(server, plugins, logger);
  const reportingFeaturePreRouting = reportingFeaturePreRoutingFactory(server, plugins, logger);

  return (getFeatureId?: GetReportingFeatureIdFn): RouteConfigFactory => {
    const preRouting: any[] = [{ method: authorizedUserPreRouting, assign: 'user' }];
    if (getFeatureId) {
      preRouting.push(reportingFeaturePreRouting(getFeatureId));
    }

    return {
      tags: [API_TAG],
      pre: preRouting,
    };
  };
}

export function getRouteOptionsCsv(
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  logger: Logger
) {
  const getRouteConfig = getRouteConfigFactoryReportingPre(server, plugins, logger);
  return {
    ...getRouteConfig(() => CSV_FROM_SAVEDOBJECT_JOB_TYPE),
    validate: {
      params: Joi.object({
        savedObjectType: Joi.string().required(),
        savedObjectId: Joi.string().required(),
      }).required(),
      payload: Joi.object({
        state: Joi.object().default({}),
        timerange: Joi.object({
          timezone: Joi.string().default('UTC'),
          min: Joi.date().required(),
          max: Joi.date().required(),
        }).optional(),
      }),
    },
  };
}

export function getRouteConfigFactoryManagementPre(
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  logger: Logger
): GetRouteConfigFactoryFn {
  const authorizedUserPreRouting = authorizedUserPreRoutingFactory(server, plugins, logger);
  const reportingFeaturePreRouting = reportingFeaturePreRoutingFactory(server, plugins, logger);
  const managementPreRouting = reportingFeaturePreRouting(() => 'management');

  return (): RouteConfigFactory => {
    return {
      pre: [
        { method: authorizedUserPreRouting, assign: 'user' },
        { method: managementPreRouting, assign: 'management' },
      ],
    };
  };
}

// NOTE: We're disabling range request for downloading the PDF. There's a bug in Firefox's PDF.js viewer
// (https://github.com/mozilla/pdf.js/issues/8958) where they're using a range request to retrieve the
// TOC at the end of the PDF, but it's sending multiple cookies and causing our auth to fail with a 401.
// Additionally, the range-request doesn't alleviate any performance issues on the server as the entire
// download is loaded into memory.
export function getRouteConfigFactoryDownloadPre(
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  logger: Logger
): GetRouteConfigFactoryFn {
  const getManagementRouteConfig = getRouteConfigFactoryManagementPre(server, plugins, logger);
  return (): RouteConfigFactory => ({
    ...getManagementRouteConfig(),
    tags: [API_TAG],
    response: {
      ranges: false,
    },
  });
}
