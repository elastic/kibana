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
import { getNonPackagedRulesCount } from '../../rules/get_existing_prepackaged_rules';
import { exportRulesSchema, exportRulesQuerySchema } from '../schemas/export_rules_schema';
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { getExportAll } from '../../rules/get_export_all';

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
        query: exportRulesQuerySchema,
      },
    },
    async handler(request: ExportRulesRequest, headers) {
      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;

      if (!alertsClient) {
        return headers.response().code(404);
      }

      const exportSizeLimit = server.config().get<number>('savedObjects.maxImportExportSize');
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
    },
  };
};

export const exportRulesRoute = (server: ServerFacade): void => {
  server.route(createExportRulesRoute(server));
};
