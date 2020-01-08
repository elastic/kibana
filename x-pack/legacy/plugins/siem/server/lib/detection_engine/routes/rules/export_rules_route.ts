/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { ExportRulesRequest } from '../../rules/types';
import { ServerFacade } from '../../../../types';
import { transformAlertsToRules, transformRulesToNdjson } from './utils';
import { getNonPackagedRules } from '../../rules/get_existing_prepackaged_rules';
import { exportRulesSchema } from '../schemas/export_rules_schema';

export const createExportRulesRoute = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: `${DETECTION_ENGINE_RULES_URL}/_export`,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: exportRulesSchema,
      },
    },
    async handler(request: ExportRulesRequest, headers) {
      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
      const actionsClient = isFunction(request.getActionsClient)
        ? request.getActionsClient()
        : null;

      if (!alertsClient || !actionsClient) {
        return headers.response().code(404);
      }

      const exportSizeLimit = server.config().get<number>('savedObjects.maxImportExportSize');
      const ruleAlertTypes = await getNonPackagedRules({ alertsClient });
      const rules = transformAlertsToRules(ruleAlertTypes);
      if (rules.length > exportSizeLimit) {
        return Boom.badRequest(`Can't export more than ${exportSizeLimit} rules`);
      }
      // TODO: Add the parameter of: excludeExportDetails: true | false and remove this if false
      // TODO: Filter out any immutable rules before including them.
      const rulesNdjson = transformRulesToNdjson({ rules, includeCount: true });

      return (
        headers
          .response(`${rulesNdjson}\n`)
          // TODO: Add a file parameter to use a different filename for the UI if it wants
          .header('Content-Disposition', `attachment; filename="export.ndjson"`)
          .header('Content-Type', 'application/ndjson')
      );
    },
  };
};

export const exportRulesRoute = (server: ServerFacade): void => {
  server.route(createExportRulesRoute(server));
};
