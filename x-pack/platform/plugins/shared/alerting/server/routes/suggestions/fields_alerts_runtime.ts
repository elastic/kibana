/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import { verifyAccessAndContext } from '../lib';
import { AlertingRequestHandlerContext, RuleTypeRegistry } from '../../types';
import { ILicenseState } from '../../lib';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../constants';
import { getIndexTemplateAndPattern } from '../../alerts_service/resource_installer_utils';

export function registerAlertsRuntimeFieldsRoute(
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  ruleTypeRegistry: RuleTypeRegistry
) {
  router.get(
    {
      path: '/internal/alerts/suggestions/runtime_fields',
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        query: schema.object({
          ruleTypeId: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, request, response) {
        const { ruleTypeId } = request.query;
        const { elasticsearch } = await context.core;

        try {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();
          const ruleType = ruleTypeRegistry.get(ruleTypeId);
          const spaceId = rulesClient.getSpaceId();

          const indexTemp = getIndexTemplateAndPattern({
            context: ruleType.alerts?.context!,
            namespace: ruleType.alerts?.isSpaceAware ? spaceId : DEFAULT_NAMESPACE_STRING,
          });

          const client = await elasticsearch.client.asInternalUser;

          const componentTemplate = await client.cluster.getComponentTemplate({
            name: indexTemp.componentTemplate,
          });

          const runtimeFields =
            componentTemplate.component_templates[0].component_template.template.mappings
              ?.runtime || {};

          return response.ok({ body: runtimeFields });
        } catch (e) {
          const kbnErr = getKbnServerError(e);
          return reportServerError(response, kbnErr);
        }
      })
    )
  );
}
