/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import * as t from 'io-ts';
import { isSiemRuleType } from '@kbn/rule-data-utils';
import { AlertingAuthorizationEntity } from '@kbn/alerting-plugin/server';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';

import type { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';
import { fieldDescriptorToBrowserFieldMapper } from '../alert_data_client/browser_fields';
import { mergeUniqueFieldsByName } from './utils/unique_fields';

export const getAlertFieldsByRuleTypeIds = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
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

        const alertsClient = await racContext.getAlertsClient();

        const authorization = await racContext.alerting.getAlertingAuthorizationWithRequest(
          request
        );
        const internalUserEsClient = (await context.core).elasticsearch.client.asInternalUser;
        const currentUserEsClient = (await context.core).elasticsearch.client.asCurrentUser;

        const registeredRuleTypes = racContext.alerting.listTypes();

        // fetch all rule types if no specific rule type Ids are provided
        const allRuleTypesIds = ruleTypeIds.length
          ? Array.isArray(ruleTypeIds)
            ? ruleTypeIds
            : [ruleTypeIds]
          : Array.from(registeredRuleTypes.keys());

        const authorizedRuleTypes = await authorization.getAllAuthorizedRuleTypesFindOperation({
          authorizationEntity: AlertingAuthorizationEntity.Alert,
          ruleTypeIds: allRuleTypesIds,
        });

        const authorizedRuleTypesIds = Array.from(authorizedRuleTypes.keys());

        const siemRuleTypeIds = authorizedRuleTypesIds.filter((ruleTypeId) =>
          isSiemRuleType(ruleTypeId)
        );
        const siemIndices =
          (siemRuleTypeIds ? await alertsClient.getAuthorizedAlertsIndices(siemRuleTypeIds) : []) ??
          [];

        const otherRuleTypeIds = authorizedRuleTypesIds.filter(
          (ruleTypeId) => !isSiemRuleType(ruleTypeId)
        );
        const otherIndices =
          (otherRuleTypeIds
            ? await alertsClient.getAuthorizedAlertsIndices(otherRuleTypeIds)
            : []) ?? [];

        const indexFilter = {
          range: {
            '@timestamp': {
              gte: 'now-90d',
            },
          },
        };

        const dataViewsService = await racContext.dataViews.dataViewsServiceFactory(
          racContext.savedObjectsClient,
          currentUserEsClient
        );

        // Fetch fields for SIEM indices using current user client
        const siemFields = siemIndices.length
          ? await dataViewsService.getFieldsForWildcard({
              pattern: siemIndices.join(','),
              allowNoIndex: true,
              includeEmptyFields: false,
              indexFilter,
            })
          : [];

        const indexPatternsFetcherAsInternalUser = new IndexPatternsFetcher(internalUserEsClient);

        // Fetch fields for other indices using internal user client
        const { fields: otherFields } = otherIndices.length
          ? await indexPatternsFetcherAsInternalUser.getFieldsForWildcard({
              pattern: otherIndices,
              metaFields: ['_id', '_index'],
              fieldCapsOptions: { allow_no_indices: true },
              includeEmptyFields: false,
              indexFilter,
            })
          : { fields: [] };

        const uniqueFields = mergeUniqueFieldsByName(otherFields, siemFields);

        const mappedFields = {
          browserFields: fieldDescriptorToBrowserFieldMapper(uniqueFields),
          fields: uniqueFields,
        };

        console.log({
          ruleTypeIds,
          authorizedRuleTypesIds,
          siemRuleTypeIds,
          otherRuleTypeIds,
          siemIndices,
          otherIndices,
          siemFields,
          otherFields,
        });

        return response.ok({
          body: mappedFields,
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
