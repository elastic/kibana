/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import type { ESQLSearchReponse } from '@kbn/es-types';
import { VisualizeESQLUserIntention } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import { visualizeESQLFunction } from '../../common/functions/visualize_esql';
import { FunctionRegistrationParameters } from '.';

export function registerVisualizeESQLFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    visualizeESQLFunction,
    async ({ arguments: { query, intention }, connectorId, messages }, signal) => {
      // With limit 0 I get only the columns, it is much more performant
      const performantQuery = `${query} | limit 0`;
      const coreContext = await resources.context.core;

      const response = (await (
        await coreContext
      ).elasticsearch.client.asCurrentUser.transport.request({
        method: 'POST',
        path: '_query',
        body: {
          query: performantQuery,
        },
      })) as ESQLSearchReponse;
      const columns =
        response.columns?.map(({ name, type }) => ({
          id: name,
          name,
          meta: { type: esFieldTypeToKibanaFieldType(type) },
        })) ?? [];
      return {
        data: {
          columns,
        },
        content: {
          message:
            intention === VisualizeESQLUserIntention.executeAndReturnResults ||
            intention === VisualizeESQLUserIntention.generateQueryOnly
              ? 'These results are not visualized'
              : 'Only following query is visualized: ```esql\n' + query + '\n```',
        },
      };
    }
  );
}
