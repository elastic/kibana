/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_RESULTS_INDEX_PATTERN } from '../../../../common/constants/index_patterns';
import { CATEGORY_EXAMPLES_MULTIPLIER } from '../../../../common/constants/new_job';
import { CategoryId, Category, Token } from '../../../../common/types/categories';
import { callWithRequestType } from '../../../../common/types/kibana';

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
      .filter((example: string | undefined) => example !== undefined);

    let tokens: Token[] = [];
    try {
      const { tokens: tempTokens } = await callWithRequest('indices.analyze', {
        body: {
          ...getAnalyzer(analyzer),
          text: examples,
        },
      });
      tokens = tempTokens;
    } catch (error) {
      // fail silently, the tokens could not be loaded
      // an empty list of tokens will be returned for each example
    }

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

    return examples.map((e, i) => ({ text: e, tokens: tokensPerExample[i] }));
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
    const examples = await categorizationExamples(
      indexPatternTitle,
      query,
      size * CATEGORY_EXAMPLES_MULTIPLIER,
      categorizationFieldName,
      timeField,
      start,
      end,
      analyzer
    );

    const sortedExamples = examples
      .map((e, i) => ({ ...e, origIndex: i }))
      .sort((a, b) => b.tokens.length - a.tokens.length);
    const validExamples = sortedExamples.filter(e => e.tokens.length > 1);

    return {
      valid: sortedExamples.length === 0 ? 0 : validExamples.length / sortedExamples.length,
      examples: sortedExamples
        .filter(
          (e, i) =>
            i / CATEGORY_EXAMPLES_MULTIPLIER - Math.floor(i / CATEGORY_EXAMPLES_MULTIPLIER) === 0
        )
        .sort((a, b) => a.origIndex - b.origIndex)
        .map(e => ({ text: e.text, tokens: e.tokens })),
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
