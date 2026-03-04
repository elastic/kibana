/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, uniq } from 'lodash';
import type { SearchHit, QueryDslFieldAndFormat } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getFlattenedObject } from '@kbn/std';

export interface SampleDoc {
  index: string;
  id: string;
  /** aggregated fields + _source */
  values: Record<string, Array<string | number | boolean>>;
}

/**
 * Return sample documents from the specified index, alias or datastream
 */
export const getSampleDocs = async ({
  index,
  size = 100,
  _source = false,
  fields = [{ field: '*', include_unmapped: true }],
  esClient,
}: {
  index: string | string[];
  size?: number;
  _source?: boolean;
  fields?: QueryDslFieldAndFormat[];
  esClient: ElasticsearchClient;
}): Promise<{ samples: SampleDoc[] }> => {
  const { hits } = await esClient.search<Record<string, any>>({
    index,
    size,
    query: {
      bool: {
        should: [
          {
            function_score: {
              functions: [
                {
                  random_score: {},
                },
              ],
            },
          },
        ],
      },
    },
    fields,
    _source,
    sort: {
      _score: {
        order: 'desc',
      },
    },
  });

  const samples = hits.hits.map<SampleDoc>(mapSearchHit);

  return { samples };
};

const mapSearchHit = (hit: SearchHit<Record<string, any>>): SampleDoc => {
  const source = getFlattenedObject(hit._source ?? {});
  const fields = hit.fields ?? {};

  const values = Object.entries({ ...fields, ...source }).reduce<
    Record<string, Array<string | number | boolean>>
  >((map, [key, value]) => {
    map[key] = uniq(castArray(value).filter(isPrimitive));
    return map;
  }, {});

  return {
    id: hit._id!,
    index: hit._index,
    values,
  };
};

const isPrimitive = (value: unknown): value is string | number | boolean => {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
};
