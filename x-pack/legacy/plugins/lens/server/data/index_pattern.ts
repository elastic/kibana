/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import {
  SavedObjectsClientContract,
  SavedObjectAttributes,
  ScopedClusterClient,
} from 'src/core/server';
import { IndexPattern, IndexPatternField, AggRestriction, markExistingFields } from '../../common';

interface SavedIndexPatternAttributes extends SavedObjectAttributes {
  title: string;
  timeFieldName: string | null;
  fields: string;
  fieldFormatMap: string;
  typeMeta: string;
}

/**
 * The number of docs to sample to determine field empty status.
 */
const SAMPLE_SIZE = 500;

export async function fetchIndexPatternWithEmptinessData({
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

  return updateFieldExistence(indexPattern, stats.hits.hits);
}

function addRestrictionsToFields(indexPattern: IndexPattern): IndexPattern {
  const { typeMeta } = indexPattern;
  if (!typeMeta) {
    return indexPattern;
  }

  // Convert map(agg -> fieldName -> restriction) to
  // map(fieldName -> agg -> restriction) so we can quickly look
  // up the restrictions by field name.
  const fieldRestrictions = Object.values(typeMeta.aggs).reduce(
    (acc, meta) => {
      Object.entries(meta).forEach(([fieldName, restriction]) => {
        const restrictionsObj = acc[fieldName] || {};
        restrictionsObj[restriction.agg] = restriction;
        acc[fieldName] = restrictionsObj;
      });

      return acc;
    },
    {} as Record<string, Record<string, AggRestriction>>
  );

  return {
    ...indexPattern,
    fields: indexPattern.fields.map(field => {
      const restriction = fieldRestrictions[field.name];
      return restriction ? { ...field, aggregationRestrictions: restriction } : field;
    }),
  };
}

async function fetchIndexPattern(
  id: string,
  savedObjectsClient: SavedObjectsClientContract
): Promise<IndexPattern> {
  const result = await savedObjectsClient.get<SavedIndexPatternAttributes>('index-pattern', id);
  const { attributes } = result;
  const allFields = JSON.parse(attributes.fields) as IndexPatternField[];
  const compatibleFields = allFields.filter(
    ({ type: fieldType, esTypes }) =>
      fieldType !== 'string' || (esTypes && esTypes.includes('keyword'))
  );

  return addRestrictionsToFields({
    id,
    title: attributes.title,
    fields: compatibleFields,
    timeFieldName: attributes.timeFieldName || undefined,
    typeMeta: attributes.typeMeta && JSON.parse(attributes.typeMeta),
    fieldFormatMap: attributes.fieldFormatMap && JSON.parse(attributes.fieldFormatMap),
  });
}

async function fetchIndexPatternStats({
  indexPattern,
  fromDate,
  toDate,
  timeZone,
  client,
}: {
  indexPattern: IndexPattern;
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

function updateFieldExistence(indexPattern: IndexPattern, docs: Array<{ _source: object }>) {
  if (!docs.length) {
    return indexPattern;
  }

  const fieldPaths = new Set(
    indexPattern.fields
      .filter(f => !f.name.startsWith('_'))
      .map(f => normalizeFieldName(f.name).split('.'))
  );

  for (const doc of docs) {
    if (fieldPaths.size === 0) {
      break;
    }

    for (const fieldName of fieldPaths) {
      if (exists(doc._source, fieldName)) {
        fieldPaths.delete(fieldName);
      }
    }
  }

  return markExistingFields(indexPattern, {
    type: 'some',
    fieldNames: Array.from(fieldPaths).map(f => f.join('.')),
  });
}
