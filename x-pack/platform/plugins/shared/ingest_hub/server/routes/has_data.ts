/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { estypes } from '@elastic/elasticsearch';
import type { RouteOptions } from '.';
import { DETECTION_HAS_DATA_PATH, INDEX_PATTERN_REGEX } from '../../common/detection_api';
import {
  isNoShardsAvailableError,
  throwHasDataSearchError,
} from '../lib/handle_has_data_search_error';

export function registerHasDataRoute({ router }: RouteOptions) {
  router.get(
    {
      path: DETECTION_HAS_DATA_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is enforced by Elasticsearch via asCurrentUser',
        },
      },
      validate: {
        query: schema.object({
          dataStreams: schema.string({
            validate: (value) => {
              const patterns = value.split(',').map((p) => p.trim());
              if (patterns.length === 0) {
                return 'dataStreams must contain at least one pattern';
              }
              for (const p of patterns) {
                if (!INDEX_PATTERN_REGEX.test(p)) {
                  return `Invalid index pattern: "${p}". Must match /^(logs|metrics)-[a-z0-9_.]+-\\*$/`;
                }
              }
            },
          }),
          start: schema.string(),
        }),
      },
      options: { access: 'internal' },
    },
    async (context, request, response) => {
      const { dataStreams: dataStreamsParam, start } = request.query;
      const patterns = dataStreamsParam.split(',').map((p) => p.trim());

      const { elasticsearch } = await context.core;
      const esClient = elasticsearch.client.asCurrentUser;

      const searches: estypes.MsearchRequestItem[] = patterns.flatMap((pattern) => [
        { index: pattern, ignore_unavailable: true, allow_partial_search_results: true },
        {
          size: 0,
          terminate_after: 1,
          track_total_hits: 1,
          query: { bool: { filter: [{ range: { '@timestamp': { gte: start } } }] } },
        } as estypes.SearchRequest,
      ]);

      try {
        const msearchResponse = await esClient.msearch({ searches });
        const results: Record<string, boolean> = {};
        patterns.forEach((pattern, i) => {
          const hit = msearchResponse.responses[i];
          if ('error' in hit) {
            results[pattern] = false;
          } else {
            results[pattern] = ((hit.hits.total as estypes.SearchTotalHits)?.value ?? 0) > 0;
          }
        });
        return response.ok({ body: { results } });
      } catch (error) {
        if (isNoShardsAvailableError(error)) {
          const results: Record<string, boolean> = {};
          patterns.forEach((p) => {
            results[p] = false;
          });
          return response.ok({ body: { results } });
        }
        throwHasDataSearchError(error);
      }
    }
  );
}
