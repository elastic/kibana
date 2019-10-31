/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { SearchResponse } from 'elasticsearch';
import _ from 'lodash';
import { IScopedClusterClient } from 'src/core/server';
import { CoreSetup } from 'src/core/server';
import { BASE_API_URL } from '../../common';
import { FieldDescriptor, IndexPatternsFetcher } from '../../../../../../src/plugins/data/server';

/**
 * The number of docs to sample to determine field empty status.
 */
const SAMPLE_SIZE = 500;

type Document = Record<string, unknown>;

export async function existingFieldsRoute(setup: CoreSetup) {
  const router = setup.http.createRouter();
  router.get(
    {
      path: `${BASE_API_URL}/existing_fields/{indexPatternTitle}`,
      validate: {
        params: schema.object({
          indexPatternTitle: schema.string(),
        }),
        query: schema.object({
          fromDate: schema.maybe(schema.string()),
          toDate: schema.maybe(schema.string()),
          timeFieldName: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      const { indexPatternTitle } = req.params;
      const requestClient = context.core.elasticsearch.dataClient;
      const indexPatternsFetcher = new IndexPatternsFetcher(requestClient.callAsCurrentUser);
      const { fromDate, toDate, timeFieldName } = req.query;

      try {
        const fields = await indexPatternsFetcher.getFieldsForWildcard({
          pattern: indexPatternTitle,
          // TODO: Pull this from kibana advanced settings
          metaFields: ['_source', '_id', '_type', '_index', '_score'],
        });

        const results = await fetchIndexPatternStats({
          fromDate,
          toDate,
          client: requestClient,
          index: indexPatternTitle,
          timeFieldName,
        });

        return res.ok({
          body: {
            indexPatternTitle,
            existingFieldNames: existingFields(results.hits.hits, fields),
          },
        });
      } catch (e) {
        if (e.status === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          return res.internalError(e.output.message);
        } else {
          return res.internalError({
            body: Boom.internal(e.message || e.name),
          });
        }
      }
    }
  );
}

function exists(obj: unknown, path: string[], i = 0): boolean {
  if (obj == null) {
    return false;
  }

  if (path.length === i) {
    return true;
  }

  if (Array.isArray(obj)) {
    return obj.some(child => exists(child, path, i));
  }

  if (typeof obj === 'object') {
    return exists((obj as Record<string, unknown>)[path[i]], path, i + 1);
  }

  return path.length === i;
}

/**
 * Exported for testing purposes only.
 */
export function existingFields(
  docs: Array<{ _source: Document }>,
  fields: FieldDescriptor[]
): string[] {
  const allFields = fields.map(field => {
    const parent = field.subType && field.subType.multi && field.subType.multi.parent;
    return {
      name: field.name,
      parent,
      path: (parent || field.name).split('.'),
    };
  });
  const missingFields = new Set(allFields);

  for (const doc of docs) {
    if (missingFields.size === 0) {
      break;
    }

    missingFields.forEach(field => {
      if (exists(doc._source, field.path)) {
        missingFields.delete(field);
      }
    });
  }

  return allFields.filter(field => !missingFields.has(field)).map(f => f.name);
}

async function fetchIndexPatternStats({
  client,
  fromDate,
  index,
  toDate,
  timeFieldName,
}: {
  client: IScopedClusterClient;
  fromDate?: string;
  index: string;
  toDate?: string;
  timeFieldName?: string;
}) {
  const body =
    !timeFieldName || !fromDate || !toDate
      ? {}
      : {
          query: {
            bool: {
              filter: [
                {
                  range: {
                    [timeFieldName]: {
                      gte: fromDate,
                      lte: toDate,
                    },
                  },
                },
              ],
            },
          },
        };

  return (await client.callAsCurrentUser('search', {
    index,
    body: {
      ...body,
      size: SAMPLE_SIZE,
    },
  })) as SearchResponse<Document>;
}
