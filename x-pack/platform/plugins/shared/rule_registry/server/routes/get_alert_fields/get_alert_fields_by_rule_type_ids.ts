/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { RacRequestHandlerContext } from '../../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../../common/constants';
import { getAlertFieldsRequestSchemaV1, getAlertFieldsResponseSchemaV1 } from '.';

export const getAlertFieldsByRuleTypeIds = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/fields`,
      validate: {
        request: {
          query: getAlertFieldsRequestSchemaV1,
        },
        response: {
          200: {
            body: () => getAlertFieldsResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'Indicates given rule type id or ids do not exist.',
          },
        },
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
        const { rule_type_ids: ruleTypeIds } = request.query;
        const ruleTypeIdsArray = ruleTypeIds
          ? Array.isArray(ruleTypeIds)
            ? ruleTypeIds
            : [ruleTypeIds]
          : [];
        const racContext = await context.rac;
        const alerting = await racContext.getAlertsClient();

        const alertFields = await alerting.getAlertFields(ruleTypeIdsArray);

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
