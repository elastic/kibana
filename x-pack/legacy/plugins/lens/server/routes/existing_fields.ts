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
  ScopedClusterClient,
} from 'src/core/server';
import { LensServerOptions } from '../server_options';
import { ExistingFields } from '../../common';

interface SavedIndexPatternAttributes extends SavedObjectAttributes {
  title: string;
  timeFieldName: string | null;
  fields: string;
  fieldFormatMap: string;
  typeMeta: string;
}

interface IndexPatternField {
  name: string;
  type: string;
  esTypes: string[];
}

/**
 * The number of docs to sample to determine field empty status.
 */
const SAMPLE_SIZE = 500;

/**
 * Compute the list of fields which have data for the specified time range.
 */
export async function existingFieldsRoute(opts: LensServerOptions) {
  opts.router.get(
    {
      path: '/existing_fields/{id}',
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
      const savedObjectsClient = opts.getScopedSavedObjectsClient(req);
      const { fromDate, toDate, timeZone } = req.query;

      try {
        const existingFields = await fetchExistingFields({
          savedObjectsClient,
          fromDate,
          toDate,
          timeZone,
          indexPatternId: req.params.id,
          client: context.core.elasticsearch.dataClient,
        });

        return res.ok({ body: existingFields });
      } catch (e) {
        if (e.isBoom) {
          return res.internalError(e);
        } else {
          return res.internalError({
            body: Boom.internal(e.message || e.name),
          });
        }
      }
    }
  );
}

async function fetchExistingFields({
  indexPatternId,
  savedObjectsClient,
  ...statsOptions
}: {
  indexPatternId: string;
  savedObjectsClient: SavedObjectsClientContract;
  client: ScopedClusterClient;
  fromDate?: string;
  toDate?: string;
  timeZone?: string;
}) {
  const indexPattern = await fetchIndexPattern(indexPatternId, savedObjectsClient);
  const stats = await fetchIndexPatternStats({
    ...statsOptions,
    indexPattern,
  });

  return getExistingFields(indexPattern, stats.hits.hits);
}

async function fetchIndexPattern(id: string, savedObjectsClient: SavedObjectsClientContract) {
  const result = await savedObjectsClient.get<SavedIndexPatternAttributes>('index-pattern', id);
  const { attributes } = result;
  const allFields = JSON.parse(attributes.fields) as IndexPatternField[];
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
  client: ScopedClusterClient;
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
  })) as SearchResponse<object>;
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

function normalizeFieldName(name: string) {
  return name.replace(/\.keyword$/, '');
}

function getExistingFields(
  indexPattern: { id: string; fields: IndexPatternField[] },
  docs: Array<{ _source: object }>
): ExistingFields {
  if (!docs.length) {
    return {
      id: indexPattern.id,
      existingFieldNames: [],
    };
  }

  const fieldPaths = indexPattern.fields
    .filter(f => !f.name.startsWith('_'))
    .map(f => normalizeFieldName(f.name).split('.'));
  const missingFieldPaths = new Set(fieldPaths);

  for (const doc of docs) {
    if (missingFieldPaths.size === 0) {
      break;
    }

    for (const fieldName of missingFieldPaths) {
      if (exists(doc._source, fieldName)) {
        missingFieldPaths.delete(fieldName);
      }
    }
  }

  return {
    id: indexPattern.id,
    existingFieldNames: _.without(
      fieldPaths.map(p => p.join('.')),
      ...Array.from(missingFieldPaths).map(f => f.join('.'))
    ),
  };
}
