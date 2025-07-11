/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import * as t from 'io-ts';

import type { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';

export const getAlertFieldsByRuleTypeIds = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/fields`,
      validate: {
        query: buildRouteValidation(
          t.partial({
            ruleTypeIds: t.union([t.array(t.string), t.string]),
          })
        ),
      },
      security: {
        authz: {
          requiredPrivileges: ['rac'],
        },
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      try {
        const { ruleTypeIds = [] } = request.query;
        const racContext = await context.rac;
        const alerting = await racContext.getAlertsClient();

        const alertFields = await alerting.getAlertFields(ruleTypeIds);

        return response.ok({
          body: alertFields,
        });
      } catch (error) {
        const formatedError = transformError(error);
        const contentType = {
          'content-type': 'application/json',
        };
        const defaultedHeaders = {
          ...contentType,
        };

        return response.customError({
          headers: defaultedHeaders,
          statusCode: formatedError.statusCode,
          body: {
            message: formatedError.message,
            attributes: {
              success: false,
            },
          },
        });
      }
    }
  );
};
