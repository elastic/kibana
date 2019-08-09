/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import _ from 'lodash';
import { first } from 'rxjs/operators';
// import { schema } from '@kbn/config-schema';
import { KibanaRequest } from 'src/core/server';
import {
  IndexPatternsService,
  FieldDescriptor,
} from '../../../../../../src/legacy/server/index_patterns/service';
import { LensCoreSetup } from '..';

interface LensSampleDocsRequestParams {
  indexPatternTitle: string;
}

interface LensStatsBodyParams {
  query: object;
  earliest: string;
  latest: string;
  timeFieldName: string;
  fields: Array<{
    name: string;
    type: string;
  }>;
}

function recursiveFlatten(
  docs: unknown[],
  indexPattern: FieldDescriptor[],
  fields: LensStatsBodyParams['fields']
): Record<
  string,
  {
    count: number;
    cardinality: number;
  }
> {
  const overallKeys: Record<
    string,
    {
      count: number;
      samples: unknown[];
    }
  > = {};

  const expectedKeys: Record<string, boolean> = {};
  fields.forEach(field => {
    expectedKeys[field.name] = true;
    // overallKeys[field.name] = false;
  });

  // TODO: Alias types
  indexPattern.forEach(field => {
    if (!expectedKeys[field.name]) {
      return;
    }

    let match;
    if (field.parent) {
      match = docs.find(doc => {
        if (!doc) {
          return;
        }
        return _.get(doc._source, field.parent!);
      });
    } else {
      // match = docs.find(doc => _.get(doc._source, field.name));
      match = docs.find(doc => {
        if (!doc) {
          return;
        }
        return _.get(doc._source, field.name);
      });
    }

    if (match) {
      const record = overallKeys[field.name];
      if (record) {
        record.count += 1;
        record.samples.push(match);
      } else {
        overallKeys[field.name] = {
          count: 1,
          samples: [match],
        };
      }
    }
  });

  const returnTypes: Record<
    string,
    {
      count: number;
      cardinality: number;
    }
  > = {};
  Object.entries(overallKeys).forEach(([key, value]) => {
    returnTypes[key] = {
      count: value.count,
      cardinality: _.uniq(value.samples).length,
    };
  });
  return returnTypes;
}

export async function initStatsRoute(setup: LensCoreSetup) {
  setup.http.route({
    path: '/api/lens/index_stats/{indexPatternTitle}',
    method: 'POST',
    // validate: {
    //   body: schema.object({
    //     query: schema.object(),
    //     earliest: schema.string(),
    //     latest: schema.string(),
    //     timeFieldName: schema.string(),
    //   }),
    // },
    async handler(req: KibanaRequest<LensSampleDocsRequestParams, unknown, LensStatsBodyParams>) {
      const client = await setup.elasticsearch.dataClient$.pipe(first()).toPromise();
      const requestClient = client.asScoped(req);

      const indexPatternsService = new IndexPatternsService(requestClient.callAsCurrentUser);

      // TODO: Use validate schema to guarantee payload
      const bodyRef = req.payload as LensStatsBodyParams;
      const { query, earliest, latest, timeFieldName, fields } = bodyRef;

      try {
        const indexPattern = await indexPatternsService.getFieldsForWildcard({
          pattern: req.params.indexPatternTitle,
          // TODO: Pull this from kibana advanced settings
          metaFields: ['_source', '_id', '_type', '_index', '_score'],
        });

        const results: any = await requestClient.callAsCurrentUser('search', {
          index: req.params.indexPatternTitle,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      [timeFieldName]: {
                        gte: earliest,
                        lte: latest,
                      },
                    },
                  },
                  query,
                ],
              },
            },
            size: 500,
          },
        });

        if (results.hits.hits.length) {
          return recursiveFlatten(results.hits.hits, indexPattern, fields);
        }
        return {};
      } catch (e) {
        setup.http.server.log(['lens', 'info'], JSON.stringify(e));
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });
}
