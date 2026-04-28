/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingRuntimeFields,
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { kqlQuery, dateRangeQuery } from '@kbn/es-query';
import { castArray } from 'lodash';

const SAMPLE_PROBABILITY_FACTOR = 3;
const SAMPLE_LIMIT_FACTOR = 10;

interface GetSampleDocumentsEsqlParams {
  esClient: ElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  kql?: string;
  size?: number;
  sampleSize?: number;
  whereCondition?: ESQLAstExpression;
  loadUnmappedFields?: boolean;
}

interface GetSampleDocumentsEsqlResponse {
  hits: Array<SearchHit<Record<string, unknown>>>;
  total: number;
}

export function getSampleDocuments({
  esClient,
  index,
  start,
  end,
  kql,
  filter,
  size = 1000,
  fields = [
    {
      field: '*',
      include_unmapped: true,
    },
  ],
  _source = false,
  timeout = '5s',
  runtime_mappings,
}: {
  esClient: ElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  kql?: string;
  size?: number;
  filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
  fields?: Array<QueryDslFieldAndFormat | string>;
  _source?: boolean;
  timeout?: string;
  runtime_mappings?: MappingRuntimeFields;
}) {
  return esClient
    .search<Record<string, any>>({
      index,
      size,
      track_total_hits: true,
      timeout,
      runtime_mappings,
      query: {
        bool: {
          must: [...kqlQuery(kql), ...dateRangeQuery(start, end), ...castArray(filter ?? [])],
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
      sort: {
        _score: {
          order: 'desc',
        },
      },
      _source,
      fields,
    })
    .then((response) => ({
      hits: response.hits.hits as Array<SearchHit<Record<string, any>>>,
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total!
          : response.hits.total?.value!,
    }));
}

export async function getSampleDocumentsEsql({
  esClient,
  index,
  start,
  end,
  kql,
  size = 1000,
  sampleSize,
  whereCondition,
  loadUnmappedFields = false,
}: GetSampleDocumentsEsqlParams): Promise<GetSampleDocumentsEsqlResponse> {
  const indices = (Array.isArray(index) ? index : [index]).join(',');
  const filter = { bool: { filter: dateRangeQuery(start, end) } };

  const whereAst = buildWhereAst({ kql, whereCondition });
  const fromCommand = Builder.command({
    name: 'from',
    args: [Builder.expression.source.index(indices), buildMetadataOption()],
  });

  const buildQuery = ({
    sampleProbability,
    limit,
  }: {
    sampleProbability?: number;
    limit?: number;
  } = {}) => {
    const commands: ESQLAstCommand[] = [fromCommand];
    if (whereAst) {
      commands.push(Builder.command({ name: 'where', args: [whereAst] }));
    }
    if (sampleProbability !== undefined && sampleProbability < 1) {
      commands.push(
        Builder.command({
          name: 'sample',
          args: [
            Builder.expression.literal.numeric({
              value: sampleProbability,
              literalType: 'double',
            }),
          ],
        })
      );
    }
    if (limit !== undefined) {
      commands.push(
        Builder.command({
          name: 'limit',
          args: [
            Builder.expression.literal.numeric({
              value: limit,
              literalType: 'integer',
            }),
          ],
        })
      );
    }

    const body = BasicPrettyPrinter.print(Builder.expression.query(commands));
    return loadUnmappedFields ? `SET unmapped_fields="LOAD"; ${body}` : body;
  };

  const buildCountQuery = () => {
    const commands: ESQLAstCommand[] = [
      Builder.command({
        name: 'from',
        args: [Builder.expression.source.index(indices)],
      }),
    ];
    if (whereAst) {
      commands.push(Builder.command({ name: 'where', args: [whereAst] }));
    }
    commands.push(
      Builder.command({
        name: 'stats',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column('total'),
            Builder.expression.func.call('COUNT', [Builder.expression.column('*')]),
          ]),
        ],
      })
    );

    const body = BasicPrettyPrinter.print(Builder.expression.query(commands));
    return loadUnmappedFields ? `SET unmapped_fields="LOAD"; ${body}` : body;
  };

  if (sampleSize !== undefined) {
    if (sampleSize <= 0) {
      return { hits: [], total: 0 };
    }

    const countResponse = (await esClient.esql.query({
      query: buildCountQuery(),
      filter,
      drop_null_columns: true,
    })) as unknown as ESQLSearchResponse;

    const total = getCount(countResponse);
    if (total === 0) {
      return { hits: [], total: 0 };
    }

    const sampleProbability = Math.min(1, (SAMPLE_PROBABILITY_FACTOR * sampleSize) / total);
    const sampleLimit = SAMPLE_LIMIT_FACTOR * sampleSize;
    const sampleResponse = (await esClient.esql.query({
      query: buildQuery({ sampleProbability, limit: sampleLimit }),
      filter,
      drop_null_columns: true,
    })) as unknown as ESQLSearchResponse;

    const hits = parseHits(sampleResponse);
    shuffleInPlace(hits); // This is very important, read the function jsdoc for more information
    return { hits: hits.slice(0, sampleSize), total: hits.length };
  }

  const response = (await esClient.esql.query({
    query: buildQuery({ limit: size }),
    filter,
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;
  const hits = parseHits(response);
  return { hits, total: hits.length };
}

function buildWhereAst({
  kql,
  whereCondition,
}: {
  kql?: string;
  whereCondition?: ESQLAstExpression;
}) {
  const kqlCondition = kql
    ? Builder.expression.func.call('KQL', [Builder.expression.literal.string(kql)])
    : undefined;

  if (kqlCondition && whereCondition) {
    return Builder.expression.func.binary('and', [kqlCondition, whereCondition]);
  }
  return kqlCondition ?? whereCondition;
}

function buildMetadataOption() {
  return Builder.option({
    name: 'METADATA',
    args: [
      Builder.expression.column({ args: [Builder.identifier({ name: '_id' })] }),
      Builder.expression.column({ args: [Builder.identifier({ name: '_source' })] }),
    ],
  });
}

function parseHits(response: ESQLSearchResponse): Array<SearchHit<Record<string, unknown>>> {
  const sourceIndex = response.columns.findIndex((column) => column.name === '_source');
  const idIndex = response.columns.findIndex((column) => column.name === '_id');
  if (sourceIndex === -1 || idIndex === -1) {
    return [];
  }

  return response.values.flatMap((row) => {
    const id = row[idIndex];
    if (typeof id !== 'string') {
      return [];
    }
    return [
      {
        _index: '',
        _id: id,
        _source: (row[sourceIndex] as Record<string, unknown> | null) ?? {},
      },
    ];
  });
}

function getCount(response: ESQLSearchResponse): number {
  const total = response.values[0]?.[0];
  return typeof total === 'number' ? total : 0;
}

/**
 * Fisher-Yates shuffle.
 *
 * The old DSL path sorted by `function_score.random_score`, so both the selected
 * documents and their returned order were random. ES|QL `SAMPLE` randomly
 * includes rows, but the resulting rows still come back in storage order; without
 * this shuffle, taking the first N rows after oversampling would reintroduce an
 * ordering bias.
 */
function shuffleInPlace<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}
