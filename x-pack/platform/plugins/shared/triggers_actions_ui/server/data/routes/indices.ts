/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// the business logic of this code is from watcher, in:
//   x-pack/platform/plugins/private/watcher/server/routes/api/indices/register_get_route.ts

const MAX_INDICES = 20;

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  ElasticsearchClient,
} from '@kbn/core/server';
import { Logger } from '@kbn/core/server';

const bodySchema = schema.object({
  pattern: schema.string(),
});

type RequestBody = TypeOf<typeof bodySchema>;

export function createIndicesRoute(logger: Logger, router: IRouter, baseRoute: string) {
  const path = `${baseRoute}/_indices`;
  logger.debug(`registering indexThreshold route POST ${path}`);
  router.post(
    {
      path,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out of authorization as it relies on ES authorization instead.',
        },
      },
      validate: {
        body: bodySchema,
      },
      options: {
        access: 'internal',
      },
    },
    handler
  );
  async function handler(
    ctx: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, RequestBody>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    const pattern = req.body.pattern;
    const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
    logger.debug(() => `route ${path} request: ${JSON.stringify(req.body)}`);

    if (pattern.trim() === '') {
      return res.ok({ body: { indices: [] } });
    }

    let aliases: string[] = [];
    try {
      aliases = await getAliasesFromPattern(esClient, pattern);
    } catch (err) {
      logger.warn(`route ${path} error getting aliases from pattern "${pattern}": ${err.message}`);
    }

    let indices: string[] = [];
    try {
      indices = await getIndicesFromPattern(esClient, pattern);
    } catch (err) {
      logger.warn(`route ${path} error getting indices from pattern "${pattern}": ${err.message}`);
    }

    let dataStreams: string[] = [];
    try {
      dataStreams = await getDataStreamsFromPattern(esClient, pattern);
    } catch (err) {
      logger.warn(
        `route ${path} error getting data streams from pattern "${pattern}": ${err.message}`
      );
    }

    const result = { indices: uniqueCombined(aliases, indices, dataStreams, MAX_INDICES) };

    logger.debug(`route ${path} response: ${JSON.stringify(result)}`);
    return res.ok({ body: result });
  }
}

function uniqueCombined(list1: string[], list2: string[], list3: string[], limit: number) {
  const set = new Set(list1.concat(list2).concat(list3));
  const result = Array.from(set);
  result.sort((string1, string2) => string1.localeCompare(string2));
  return result.slice(0, limit);
}

async function getIndicesFromPattern(
  esClient: ElasticsearchClient,
  pattern: string
): Promise<string[]> {
  const params = {
    index: pattern,
    ignore_unavailable: true,
    body: {
      size: 0, // no hits
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: MAX_INDICES,
          },
        },
      },
    },
  };
  const response = await esClient.search(params);
  // TODO: Investigate when the status field might appear here, type suggests it shouldn't ever happen

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((response as any).status === 404 || !response.aggregations) {
    return [];
  }

  return (response.aggregations as unknown as IndiciesAggregation).indices.buckets.map(
    (bucket) => bucket.key
  );
}

async function getAliasesFromPattern(
  esClient: ElasticsearchClient,
  pattern: string
): Promise<string[]> {
  const params = {
    index: pattern,
    ignore_unavailable: true,
  };
  const result: string[] = [];

  const response = await esClient.indices.getAlias(params, { meta: true });
  const responseBody = response.body;

  if (response.statusCode === 404) {
    return result;
  }

  for (const index of Object.keys(responseBody)) {
    const aliasRecord = responseBody[index];
    if (aliasRecord.aliases) {
      const aliases = Object.keys(aliasRecord.aliases);
      result.push(...aliases);
    }
  }

  return result;
}

async function getDataStreamsFromPattern(
  esClient: ElasticsearchClient,
  pattern: string
): Promise<string[]> {
  const params = {
    name: pattern,
  };

  const { data_streams: response } = await esClient.indices.getDataStream(params);
  return response.map((r) => r.name);
}

interface IndiciesAggregation {
  indices: {
    buckets: Array<{ key: string }>;
  };
}
