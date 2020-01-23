/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import _ from 'lodash';
import { IScopedClusterClient, SavedObject, RequestHandlerContext } from 'src/core/server';
import { CoreSetup } from 'src/core/server';
import { BASE_API_URL } from '../../common';
import { IndexPatternsFetcher } from '../../../../../../src/plugins/data/server';

/**
 * The number of docs to sample to determine field empty status.
 */
const SAMPLE_SIZE = 500;

interface MappingResult {
  [indexPatternTitle: string]: {
    mappings: {
      properties: Record<string, { type: string; path: string }>;
    };
  };
}

interface FieldDescriptor {
  name: string;
  subType?: { multi?: { parent?: string } };
}

export interface Field {
  name: string;
  isScript: boolean;
  isAlias: boolean;
  path: string[];
  lang?: string;
  script?: string;
}

// TODO: Pull this from kibana advanced settings
const metaFields = ['_source', '_id', '_type', '_index', '_score'];

export async function existingFieldsRoute(setup: CoreSetup) {
  const router = setup.http.createRouter();
  router.get(
    {
      path: `${BASE_API_URL}/existing_fields/{indexPatternId}`,
      validate: {
        params: schema.object({
          indexPatternId: schema.string(),
        }),
        query: schema.object({
          fromDate: schema.maybe(schema.string()),
          toDate: schema.maybe(schema.string()),
          timeFieldName: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      try {
        return res.ok({
          body: await fetchFieldExistence({
            ...req.query,
            ...req.params,
            context,
          }),
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

async function fetchFieldExistence({
  context,
  indexPatternId,
  fromDate,
  toDate,
  timeFieldName,
}: {
  indexPatternId: string;
  context: RequestHandlerContext;
  fromDate?: string;
  toDate?: string;
  timeFieldName?: string;
}) {
  const {
    indexPattern,
    indexPatternTitle,
    mappings,
    fieldDescriptors,
  } = await fetchIndexPatternDefinition(indexPatternId, context);

  const fields = buildFieldList(indexPattern, mappings, fieldDescriptors);

  const docs = await fetchIndexPatternStats({
    fromDate,
    toDate,
    client: context.core.elasticsearch.dataClient,
    index: indexPatternTitle,
    timeFieldName: timeFieldName || indexPattern.attributes.timeFieldName,
    fields,
  });

  return {
    indexPatternTitle,
    existingFieldNames: existingFields(docs, fields),
  };
}

async function fetchIndexPatternDefinition(indexPatternId: string, context: RequestHandlerContext) {
  const savedObjectsClient = context.core.savedObjects.client;
  const requestClient = context.core.elasticsearch.dataClient;
  const indexPattern = await savedObjectsClient.get('index-pattern', indexPatternId);
  const indexPatternTitle = indexPattern.attributes.title;
  // TODO: maybe don't use IndexPatternsFetcher at all, since we're only using it
  // to look up field values in the resulting documents. We can accomplish the same
  // using the mappings which we're also fetching here.
  const indexPatternsFetcher = new IndexPatternsFetcher(requestClient.callAsCurrentUser);
  const [mappings, fieldDescriptors] = await Promise.all([
    requestClient.callAsCurrentUser('indices.getMapping', {
      index: indexPatternTitle,
    }),

    indexPatternsFetcher.getFieldsForWildcard({
      pattern: indexPatternTitle,
      // TODO: Pull this from kibana advanced settings
      metaFields,
    }),
  ]);

  return {
    indexPattern,
    indexPatternTitle,
    mappings,
    fieldDescriptors,
  };
}

/**
 * Exported only for unit tests.
 */
export function buildFieldList(
  indexPattern: SavedObject,
  mappings: MappingResult,
  fieldDescriptors: FieldDescriptor[]
): Field[] {
  const aliasMap = Object.entries(Object.values(mappings)[0].mappings.properties)
    .map(([name, v]) => ({ ...v, name }))
    .filter(f => f.type === 'alias')
    .reduce((acc, f) => {
      acc[f.name] = f.path;
      return acc;
    }, {} as Record<string, string>);

  const descriptorMap = fieldDescriptors.reduce((acc, f) => {
    acc[f.name] = f;
    return acc;
  }, {} as Record<string, FieldDescriptor>);

  return JSON.parse(indexPattern.attributes.fields).map(
    (field: { name: string; lang: string; scripted?: boolean; script?: string }) => {
      const path =
        aliasMap[field.name] || descriptorMap[field.name]?.subType?.multi?.parent || field.name;
      return {
        name: field.name,
        isScript: !!field.scripted,
        isAlias: !!aliasMap[field.name],
        path: path.split('.'),
        lang: field.lang,
        script: field.script,
      };
    }
  );
}

async function fetchIndexPatternStats({
  client,
  index,
  timeFieldName,
  fromDate,
  toDate,
  fields,
}: {
  client: IScopedClusterClient;
  index: string;
  timeFieldName?: string;
  fromDate?: string;
  toDate?: string;
  fields: Field[];
}) {
  let query;

  if (timeFieldName && fromDate && toDate) {
    query = {
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
    };
  } else {
    query = {
      match_all: {},
    };
  }
  const viableFields = fields.filter(
    f => !f.isScript && !f.isAlias && !metaFields.includes(f.name)
  );
  const scriptedFields = fields.filter(f => f.isScript);

  const result = await client.callAsCurrentUser('search', {
    index,
    body: {
      size: SAMPLE_SIZE,
      _source: viableFields.map(f => f.name),
      query,
      script_fields: scriptedFields.reduce((acc, field) => {
        acc[field.name] = {
          script: {
            lang: field.lang,
            source: field.script,
          },
        };
        return acc;
      }, {} as Record<string, unknown>),
    },
  });

  return result.hits.hits;
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
 * Exported only for unit tests.
 */
export function existingFields(
  docs: Array<{ _source: unknown; fields: unknown }>,
  fields: Field[]
): string[] {
  const missingFields = new Set(fields);

  for (const doc of docs) {
    if (missingFields.size === 0) {
      break;
    }

    missingFields.forEach(field => {
      if (exists(field.isScript ? doc.fields : doc._source, field.path)) {
        missingFields.delete(field);
      }
    });
  }

  return fields.filter(field => !missingFields.has(field)).map(f => f.name);
}
