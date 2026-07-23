/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ESQLColumn } from '@kbn/es-types';
import { getESQLResults } from '@kbn/esql-utils';
import dateMath from '@kbn/datemath';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import {
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
  CUSTOM_CONTENT_ENABLED_FLAG_KEY,
  CUSTOM_CONTENT_RENDER_ROUTE,
} from '../../common/constants';
import { fillTemplate } from '../utils/fill_template';

interface StartDeps {
  data: DataPluginStart;
}

export function registerRenderRoute(
  router: IRouter,
  getStartServices: CoreSetup<StartDeps>['getStartServices'],
  logger: Logger
) {
  router.post(
    {
      path: CUSTOM_CONTENT_RENDER_ROUTE,
      security: {
        authz: { enabled: false, reason: 'Delegates auth to elasticsearch' },
      },
      options: { access: 'internal' },
      validate: {
        body: schema.object({
          template: schema.string({ maxLength: CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH }),
          esqlQuery: schema.string({ maxLength: CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH }),
          timeRange: schema.maybe(schema.object({ from: schema.string(), to: schema.string() })),
          timeField: schema.maybe(schema.string({ maxLength: 256 })),
        }),
      },
    },
    async (context, request, response) => {
      const [coreStart, { data }] = await getStartServices();

      if (!coreStart.featureFlags.getBooleanValue(CUSTOM_CONTENT_ENABLED_FLAG_KEY, false)) {
        return response.notFound();
      }

      const { template, esqlQuery, timeRange, timeField } = request.body;

      const gte = timeRange && dateMath.parse(timeRange.from)?.toISOString();
      const lt = timeRange && dateMath.parse(timeRange.to, { roundUp: true })?.toISOString();
      const filter =
        timeRange && timeField && gte && lt
          ? { range: { [timeField]: { gte, lt, format: 'strict_date_optional_time' } } }
          : undefined;

      try {
        const search = data.search.asScoped(request).search;
        const { response: esqlResponse } = await getESQLResults({ search, esqlQuery, filter });
        const html = fillTemplate(
          template,
          esqlResponse.columns as ESQLColumn[],
          esqlResponse.values as unknown[][]
        );
        return response.ok({ body: { html } });
      } catch (err) {
        logger.error(`Custom content render failed: ${err.message}`);
        return response.customError({
          statusCode: 500,
          body: { message: err.message },
        });
      }
    }
  );
}
