/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { SearchResponse } from 'elasticsearch';
import _ from 'lodash';
import {
  SavedObjectsClientContract,
  SavedObjectAttributes,
  IScopedClusterClient,
} from 'src/core/server';
import { CoreSetup } from 'src/core/server';
import { LensServerOptions } from '../server_options';
import { BASE_API_URL } from '../../common';
import { FieldDescriptor } from '../../../../../../src/legacy/server/index_patterns/service';

/**
 * The number of docs to sample to determine field empty status.
 */
const SAMPLE_SIZE = 500;

type Document = Record<string, unknown>;

interface SavedIndexPatternAttributes extends SavedObjectAttributes {
  title: string;
  timeFieldName: string | null;
  fields: string;
  fieldFormatMap: string;
  typeMeta: string;
}

export async function existingFieldsRoute(
  setup: CoreSetup,
  { getScopedSavedObjectsClient }: LensServerOptions
) {
  const router = setup.http.createRouter();
  router.get(
    {
      path: `${BASE_API_URL}/existing_fields/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        query: schema.object({
          fromDate: schema.maybe(schema.string()),
          toDate: schema.maybe(schema.string()),
          timeZone: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      const requestClient = context.core.elasticsearch.dataClient;
      const savedObjectsClient = getScopedSavedObjectsClient(req);
      const { fromDate, toDate, timeZone } = req.query;

      try {
        const indexPattern = await fetchIndexPattern(req.params.id, savedObjectsClient);

        const results = await fetchIndexPatternStats({
          client: requestClient,
          fromDate,
          toDate,
          indexPattern,
          timeZone,
        });

        return res.ok({
          body: {
            id: indexPattern.id,
            existingFieldNames: existingFields(results.hits.hits, indexPattern.fields),
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

  if (Array.isArray(obj)) {
    return obj.some(child => exists(child, path, i));
  }

  if (typeof obj === 'object') {
    return exists((obj as Record<string, unknown>)[path[i]], path, i + 1);
  }

  return path.length === i;
}

/**
 * Exported solely for testing purposes.
 */
export function existingFields(
  docs: Array<{ _source: Document }>,
  fields: FieldDescriptor[]
): string[] {
  const allFields = fields.map(field => ({
    name: field.name,
    parent: field.parent,
    path: (field.parent || field.name).split('.'),
  }));
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

async function fetchIndexPattern(id: string, savedObjectsClient: SavedObjectsClientContract) {
  const result = await savedObjectsClient.get<SavedIndexPatternAttributes>('index-pattern', id);
  const { attributes } = result;
  const allFields = JSON.parse(attributes.fields) as FieldDescriptor[];
  const compatibleFields = allFields.filter(
    ({ type: fieldType, esTypes }) =>
      fieldType !== 'string' || (esTypes && esTypes.includes('keyword'))
  );

  return {
    id,
    title: attributes.title,
    fields: compatibleFields,
    timeFieldName: attributes.timeFieldName,
    typeMeta: attributes.typeMeta && JSON.parse(attributes.typeMeta),
    fieldFormatMap: attributes.fieldFormatMap && JSON.parse(attributes.fieldFormatMap),
  };
}

async function fetchIndexPatternStats({
  indexPattern,
  fromDate,
  toDate,
  timeZone,
  client,
}: {
  indexPattern: Pick<SavedIndexPatternAttributes, 'title' | 'timeFieldName'>;
  fromDate?: string;
  toDate?: string;
  timeZone?: string;
  client: IScopedClusterClient;
}) {
  const body =
    !indexPattern.timeFieldName || !fromDate || !toDate
      ? {}
      : {
          query: {
            bool: {
              filter: [
                {
                  range: {
                    [indexPattern.timeFieldName]: {
                      gte: fromDate,
                      lte: toDate,
                      time_zone: timeZone,
                    },
                  },
                },
              ],
            },
          },
        };

  return (await client.callAsCurrentUser('search', {
    index: indexPattern.title,
    body: {
      ...body,
      size: SAMPLE_SIZE,
    },
  })) as SearchResponse<Document>;
}
