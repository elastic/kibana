/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthzDisabled } from '@kbn/core-security-server';
import { API_BASE_PATH } from '../../common/constants';
import type { EsqlResponse } from '../../common/types';
import { runEsql } from '../lib/esql';
import { esqlToFile } from '../lib/export';
import { handleError } from '../lib/handle_error';
import { esqlBodySchema, exportEsqlBodySchema } from './schemas';
import type { RouteDependencies } from './types';

/** Registers routes for running and exporting ES|QL queries. */
export function registerEsqlRoutes({ router, logger }: RouteDependencies): void {
  router.post(
    {
      path: `${API_BASE_PATH}/esql`,
      security: { authz: AuthzDisabled.delegateToESClient },
      validate: { body: esqlBodySchema },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const body: EsqlResponse = await runEsql({ esClient, body: request.body });
        return response.ok({ body });
      } catch (error) {
        return handleError(error, response, logger);
      }
    }
  );

  router.post(
    {
      path: `${API_BASE_PATH}/esql/_export`,
      security: { authz: AuthzDisabled.delegateToESClient },
      validate: { body: exportEsqlBodySchema },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const { format, ...body } = request.body;
        const result = await runEsql({ esClient, body });
        const file = esqlToFile('esql_results', result, format);
        return response.ok({
          body: file.body,
          headers: {
            'content-type': file.contentType,
            'content-disposition': `attachment; filename="${file.filename}"`,
          },
        });
      } catch (error) {
        return handleError(error, response, logger);
      }
    }
  );
}
