/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';

import { GrokdebuggerRequest } from '../../../models/grokdebugger_request';
import { GrokdebuggerResponse } from '../../../models/grokdebugger_response';

import { handleEsError } from '../../../shared_imports';

import type { KibanaFramework } from '../../../lib/kibana_framework';

export const requestBodySchema = schema.object({
  pattern: schema.string(),
  rawEvent: schema.string(),
  // Dynamic pattern-name keys with string definitions, e.g. { POSTFIX_QUEUEID: '[0-9A-F]{10,11}' }
  customPatterns: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
});

export function registerGrokSimulateRoute(framework: KibanaFramework) {
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/grokdebugger/simulate',
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: requestBodySchema,
      },
    },
    async (requestContext, request, response) => {
      try {
        const esClient = (await requestContext.core).elasticsearch.client;
        const grokdebuggerRequest = GrokdebuggerRequest.fromDownstreamJSON(request.body);
        const simulateResponseFromES = await esClient.asCurrentUser.ingest.simulate(
          grokdebuggerRequest.upstreamJSON
        );
        const grokdebuggerResponse = GrokdebuggerResponse.fromUpstreamJSON(simulateResponseFromES);
        return response.ok({
          body: grokdebuggerResponse,
        });
      } catch (error: unknown) {
        if (error instanceof errors.ElasticsearchClientError) {
          return handleEsError({ error, response });
        }
        throw error;
      }
    }
  );
}
