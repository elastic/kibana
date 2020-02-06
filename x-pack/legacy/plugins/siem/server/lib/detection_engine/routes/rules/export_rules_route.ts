/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Hapi from 'hapi';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { LegacySetupServices, RequestFacade } from '../../../../plugin';
import { GetScopedClientServices } from '../../../../services';
import { ExportRulesRequest } from '../../rules/types';
import { getNonPackagedRulesCount } from '../../rules/get_existing_prepackaged_rules';
import { exportRulesSchema, exportRulesQuerySchema } from '../schemas/export_rules_schema';
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { getExportAll } from '../../rules/get_export_all';

export const createExportRulesRoute = (
  config: LegacySetupServices['config'],
  getServices: GetScopedClientServices
): Hapi.ServerRoute => {
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
        query: exportRulesQuerySchema,
      },
    },
    async handler(request: ExportRulesRequest & RequestFacade, headers) {
      const { alertsClient } = await getServices(request);

      if (!alertsClient) {
        return headers.response().code(404);
      }

      try {
        const exportSizeLimit = config().get<number>('savedObjects.maxImportExportSize');
        if (request.payload?.objects != null && request.payload.objects.length > exportSizeLimit) {
          return Boom.badRequest(`Can't export more than ${exportSizeLimit} rules`);
        } else {
          const nonPackagedRulesCount = await getNonPackagedRulesCount({ alertsClient });
          if (nonPackagedRulesCount > exportSizeLimit) {
            return Boom.badRequest(`Can't export more than ${exportSizeLimit} rules`);
          }
        }

        const exported =
          request.payload?.objects != null
            ? await getExportByObjectIds(alertsClient, request.payload.objects)
            : await getExportAll(alertsClient);

        const response = request.query.exclude_export_details
          ? headers.response(exported.rulesNdjson)
          : headers.response(`${exported.rulesNdjson}${exported.exportDetails}`);

        return response
          .header('Content-Disposition', `attachment; filename="${request.query.file_name}"`)
          .header('Content-Type', 'application/ndjson');
      } catch {
        return Boom.badRequest(`Sorry, something went wrong to export rules`);
      }
    },
  };
};

export const exportRulesRoute = (
  route: LegacySetupServices['route'],
  config: LegacySetupServices['config'],
  getServices: GetScopedClientServices
): void => {
  route(createExportRulesRoute(config, getServices));
};
