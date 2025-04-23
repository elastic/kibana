/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type {
  FindRulesInternalRequestBodyV1,
  FindRulesResponseV1,
} from '../../../../../common/routes/rule/apis/find';
import { findRulesInternalRequestBodySchemaV1 } from '../../../../../common/routes/rule/apis/find';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import type { ILicenseState } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_ALERTING_API_FIND_RULES_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';
import { trackLegacyTerminology } from '../../../lib/track_legacy_terminology';
import { transformFindRulesInternalBodyV1, transformFindRulesResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const findInternalRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.post(
    {
      path: INTERNAL_ALERTING_API_FIND_RULES_PATH,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        body: findRulesInternalRequestBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const cckClient = alertingContext.cckClientGetter();
        const rulesClient = await alertingContext.getRulesClient();

        const body: FindRulesInternalRequestBodyV1 = req.body;

        trackLegacyTerminology(
          [req.body.search, req.body.search_fields, req.body.sort_field].filter(
            Boolean
          ) as string[],
          usageCounter
        );

        const options = transformFindRulesInternalBodyV1({
          ...body,
          has_reference: body.has_reference || undefined,
          search_fields: searchFieldsAsArray(body.search_fields),
        });

        if (req.body.fields) {
          usageCounter?.incrementCounter({
            counterName: `alertingFieldsUsage`,
            counterType: 'alertingFieldsUsage',
            incrementBy: 1,
          });
        }

        const remoteResults = await cckClient.request<FindRulesResponseV1<RuleParamsV1>['body']>(
          'POST',
          `/internal/alerting/rules/_find`,
          req.body
        );

        const findResult = await rulesClient.find({
          options,
          excludeFromPublicApi: false,
          includeSnoozeData: true,
        });

        const responseBody: FindRulesResponseV1<RuleParamsV1>['body'] =
          transformFindRulesResponseV1<RuleParamsV1>(findResult, options.fields);

        const mergedResponseBody = remoteResults.reduce((acc, remoteResult) => {
          console.log(remoteResult);
          if (remoteResult.status === 'rejected') {
            return acc;
          }
          const { data } = remoteResult.value;
          const { page, per_page: perPage, total, data: remoteData } = data;
          return {
            ...acc,
            page,
            per_page: perPage + acc.per_page,
            total: total + acc.total,
            data: [
              ...acc.data,
              ...remoteData.map((rule) => ({
                ...rule,
                server: remoteResult.server,
              })),
            ],
          };
        }, responseBody);

        return res.ok({
          body: mergedResponseBody,
        });
      })
    )
  );
};

function searchFieldsAsArray(searchFields: string | string[] | undefined): string[] | undefined {
  if (!searchFields) {
    return;
  }
  return Array.isArray(searchFields) ? searchFields : [searchFields];
}
