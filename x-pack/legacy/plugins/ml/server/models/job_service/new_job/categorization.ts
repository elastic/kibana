/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chunk } from 'lodash';
import { ML_RESULTS_INDEX_PATTERN } from '../../../../common/constants/index_patterns';
import { CATEGORY_EXAMPLES_SAMPLE_SIZE } from '../../../../common/constants/new_job';
import { CategoryId, Category, Token } from '../../../../common/types/categories';
import { callWithRequestType } from '../../../../common/types/kibana';

const VALID_TOKEN_COUNT = 3;
const CHUNK_SIZE = 100;

export function categorizationExamplesProvider(callWithRequest: callWithRequestType) {
  async function categorizationExamples(
    indexPatternTitle: string,
    query: any,
    size: number,
    categorizationFieldName: string,
    timeField: string | undefined,
    start: number,
    end: number,
    analyzer?: any
  ) {
    if (timeField !== undefined) {
      const range = {
        range: {
          [timeField]: {
            gte: start,
            format: 'epoch_millis',
          },
        },
      };

      if (query.bool === undefined) {
        query.bool = {};
      }
      if (query.bool.filter === undefined) {
        query.bool.filter = range;
      } else {
        if (Array.isArray(query.bool.filter)) {
          query.bool.filter.push(range);
        } else {
          query.bool.filter.range = range;
        }
      }
    }

    const results = await callWithRequest('search', {
      index: indexPatternTitle,
      size,
      body: {
        _source: categorizationFieldName,
        query,
      },
    });
    const examples: string[] = results.hits?.hits
      ?.map((doc: any) => doc._source[categorizationFieldName])
      .filter((example: string | null | undefined) => example !== undefined && example !== null);

    async function loadTokens(chunkSize: number) {
      const exampleChunks = chunk(examples, chunkSize);
      const tokensPerChunks = await Promise.all(exampleChunks.map(c => getTokens(c, analyzer)));
      const tokensPerExample = tokensPerChunks.flat();
      return examples.map((e, i) => ({ text: e, tokens: tokensPerExample[i] }));
    }
    try {
      return loadTokens(CHUNK_SIZE);
    } catch (error) {
      // if an error is thrown when loading the tokens, lower the chunk size by half and try again
      // the error may have been caused by too many tokens being found.
      // the _analyze endpoint has a maximum of 10000 tokens.
      return loadTokens(CHUNK_SIZE / 2);
    }
  }

  async function getTokens(examples: string[], analyzer?: any) {
    const { tokens }: { tokens: Token[] } = await callWithRequest('indices.analyze', {
      body: {
        ...getAnalyzer(analyzer),
        text: examples,
      },
    });

    const lengths = examples.map(e => e.length);
    const sumLengths = lengths.map((s => (a: number) => (s += a))(0));

    const tokensPerExample: Token[][] = examples.map(e => []);

    tokens.forEach((t, i) => {
      for (let g = 0; g < sumLengths.length; g++) {
        if (t.start_offset <= sumLengths[g] + g) {
          const offset = g > 0 ? sumLengths[g - 1] + g : 0;
          tokensPerExample[g].push({
            ...t,
            start_offset: t.start_offset - offset,
            end_offset: t.end_offset - offset,
          });
          break;
        }
      }
    });
    return tokensPerExample;
  }

  function getAnalyzer(analyzer: any) {
    if (typeof analyzer === 'object' && analyzer.tokenizer !== undefined) {
      return analyzer;
    } else {
      return { analyzer: 'standard' };
    }
  }

  async function validateCategoryExamples(
    indexPatternTitle: string,
    query: any,
    size: number,
    categorizationFieldName: string,
    timeField: string | undefined,
    start: number,
    end: number,
    analyzer?: any
  ) {
    const resp = await categorizationExamples(
      indexPatternTitle,
      query,
      CATEGORY_EXAMPLES_SAMPLE_SIZE,
      categorizationFieldName,
      timeField,
      start,
      end,
      analyzer
    );

    const sortedExamples = resp
      .map((e, i) => ({ ...e, origIndex: i }))
      .sort((a, b) => b.tokens.length - a.tokens.length);
    const validExamples = sortedExamples.filter(e => e.tokens.length >= VALID_TOKEN_COUNT);
    const sampleSize = sortedExamples.length;

    const multiple = Math.floor(sampleSize / size) || sampleSize;
    const filteredExamples = [];
    let i = 0;
    while (filteredExamples.length < size && i < sortedExamples.length) {
      filteredExamples.push(sortedExamples[i]);
      i += multiple;
    }
    const examples = filteredExamples
      .sort((a, b) => a.origIndex - b.origIndex)
      .map(e => ({ text: e.text, tokens: e.tokens }));

    return {
      sampleSize,
      valid: sortedExamples.length === 0 ? 0 : validExamples.length / sortedExamples.length,
      examples,
    };
  }

  async function getTotalCategories(jobId: string): Promise<{ total: number }> {
    const totalResp = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  job_id: jobId,
                },
              },
              {
                exists: {
                  field: 'category_id',
                },
              },
            ],
          },
        },
      },
    });
    return totalResp?.hits?.total?.value ?? 0;
  }

  async function getTopCategoryCounts(jobId: string, numberOfCategories: number) {
    const top = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  job_id: jobId,
                },
              },
              {
                term: {
                  result_type: 'model_plot',
                },
              },
              {
                term: {
                  by_field_name: 'mlcategory',
                },
              },
            ],
          },
        },
        aggs: {
          cat_count: {
            terms: {
              field: 'by_field_value',
              size: numberOfCategories,
            },
          },
        },
      },
    });

    const catCounts: Array<{
      id: CategoryId;
      count: number;
    }> = top.aggregations?.cat_count?.buckets.map((c: any) => ({
      id: c.key,
      count: c.doc_count,
    }));
    return catCounts || [];
  }

  async function getCategories(
    jobId: string,
    catIds: CategoryId[],
    size: number
  ): Promise<Category[]> {
    const categoryFilter = catIds.length
      ? {
          terms: {
            category_id: catIds,
          },
        }
      : {
          exists: {
            field: 'category_id',
          },
        };
    const result = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      size,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  job_id: jobId,
                },
              },
              categoryFilter,
            ],
          },
        },
      },
    });

    return result.hits.hits?.map((c: { _source: Category }) => c._source) || [];
  }

  async function topCategories(jobId: string, numberOfCategories: number) {
    const catCounts = await getTopCategoryCounts(jobId, numberOfCategories);
    const categories = await getCategories(
      jobId,
      catCounts.map(c => c.id),
      catCounts.length || numberOfCategories
    );

    const catsById = categories.reduce((p, c) => {
      p[c.category_id] = c;
      return p;
    }, {} as { [id: number]: Category });

    const total = await getTotalCategories(jobId);

    if (catCounts.length) {
      return {
        total,
        categories: catCounts.map(({ id, count }) => {
          return {
            count,
            category: catsById[id] ?? null,
          };
        }),
      };
    } else {
      return {
        total,
        categories: categories.map(category => {
          return {
            category,
          };
        }),
      };
    }
  }

  return {
    categorizationExamples,
    validateCategoryExamples,
    topCategories,
  };
}
