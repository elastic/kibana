/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type {
  FindRulesRequestQueryV1,
  FindRulesResponseV1,
} from '../../../../../../common/routes/rule/apis/find/external';
import {
  findRulesRequestQuerySchemaV1,
  findRuleParamsExamplesV1,
  findRulesResponseSchemaV1,
} from '../../../../../../common/routes/rule/apis/find/external';
import type { ILicenseState } from '../../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../../types';
import { verifyAccessAndContext } from '../../../../lib';
import { trackLegacyTerminology } from '../../../../lib/track_legacy_terminology';
import { transformFindRulesBodyV1, transformFindRulesResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export const findRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/rules/_find`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Get information about rules',
        tags: ['oas-tag:alerting'],
        oasOperationObject: findRuleParamsExamplesV1,
      },
      validate: {
        request: {
          query: findRulesRequestQuerySchemaV1,
        },
        response: {
          200: {
            body: () => findRulesResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = await (await context.alerting).getRulesClient();

        const query: FindRulesRequestQueryV1 = req.query;

        trackLegacyTerminology(
          [query.search, query.search_fields, query.sort_field].filter(Boolean) as string[],
          usageCounter
        );

        const options = transformFindRulesBodyV1({
          ...query,
          has_reference: query.has_reference || undefined,
        });

        if (req.query.fields) {
          usageCounter?.incrementCounter({
            counterName: `alertingFieldsUsage`,
            counterType: 'alertingFieldsUsage',
            incrementBy: 1,
          });
        }

        const findResult = await rulesClient.find({
          options,
          excludeFromPublicApi: true,
          includeSnoozeData: true,
        });

        const responseBody: FindRulesResponseV1 = transformFindRulesResponseV1(
          findResult,
          options.fields
        );

        return res.ok({
          body: responseBody,
        });
      })
    )
  );
};
