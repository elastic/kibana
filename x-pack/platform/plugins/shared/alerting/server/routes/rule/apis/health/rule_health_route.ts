/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { ruleHealthAggregationFactoryV1 } from '../../../../application/rule/methods/aggregate';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { trackLegacyTerminology } from '../../../lib/track_legacy_terminology';
import type {
  RuleHealthRequestBodyV1,
  RuleHealthResponseV1,
} from '../../../../../common/routes/rule/apis/health';
import { ruleHealthRequestBodySchemaV1 } from '../../../../../common/routes/rule/apis/health';
import { transformAggregateQueryRequestV1 } from '../aggregate/transforms';
import { formatRuleHealthAggregationResult, transformRuleHealthBodyResponse } from './transforms';
import type { RuleHealthAggregationResult } from './types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const ruleHealthRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_health`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        body: ruleHealthRequestBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const body: RuleHealthRequestBodyV1 = req.body;
        const options = transformAggregateQueryRequestV1({
          ...body,
          has_reference: body.has_reference || undefined,
        });
        trackLegacyTerminology(
          [body.search, body.search_fields].filter(Boolean) as string[],
          usageCounter
        );

        const aggregateResult = await rulesClient.aggregate<RuleHealthAggregationResult>({
          aggs: ruleHealthAggregationFactoryV1(),
          options,
        });

        const responsePayload: RuleHealthResponseV1 = {
          body: transformRuleHealthBodyResponse(formatRuleHealthAggregationResult(aggregateResult)),
        };

        return res.ok(responsePayload);
      })
    )
  );
};
