/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_RESULTS_INDEX_PATTERN } from '../../../../common/constants/index_patterns';

type callWithRequestType = (action: string, params: any) => Promise<any>;

interface Token {
  token: string;
  start_offset: number;
  end_offset: number;
  type: string;
  position: number;
}

interface Category {
  job_id: string;
  category_id: number;
  terms: string;
  regex: string;
  max_matching_length: number;
  examples: string[];
  grok_pattern: string;
}

const testCat: Category = {
  job_id: 'dasdasdd',
  category_id: 100,
  terms: 'HEAD projects xdotool HTTP IrssiUrlLog',
  regex: '.*?HEAD.+?projects.+?xdotool.+?HTTP.+?IrssiUrlLog.*',
  max_matching_length: 119,
  examples: [''],
  grok_pattern:
    '.*?%{IP:ipaddress}.+?%{HTTPDATE:timestamp}.+?HEAD.+?%{PATH:path}.*?projects.*?%{PATH:path2}.*?xdotool.*?%{PATH:path3}.+?HTTP.*?%{PATH:path4}.*?%{QUOTEDSTRING:field}.+?%{QUOTEDSTRING:field2}.*?IrssiUrlLog.*?%{PATH:path5}.*',
};

export function categorizationExamplesProvider(callWithRequest: callWithRequestType) {
  async function categorizationExamples(
    indexPatternTitle: string,
    query: object,
    size: number,
    categorizationFieldName: string,
    start: number,
    end: number
  ) {
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
          analyzer: 'standard',
          text: examples,
        },
      });
      tokens = tempTokens;
    } catch (error) {
      // do somehting with this error
    }

    const lengths = examples.map(e => e.length);
    const sumLengths = lengths.map((s => (a: number) => (s += a))(0));

    const tokensPerExample: Token[][] = lengths.map(l => []);
    tokens.forEach((t, i) => {
      for (let g = 0; g < sumLengths.length; g++) {
        if (t.token === 'dashboard2') {
          const d = 0;
        }
        if (t.start_offset <= sumLengths[g]) {
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

  async function getCategories(
    jobId: string,
    categoryId: number
  ): Promise<{ categories: Category[] }> {
    return callWithRequest('ml.categories', { jobId, categoryId });
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
            cardinality: {
              field: 'by_field_value',
            },
          },
        },
      },
    });
    return totalResp?.aggregations?.cat_count?.value ?? 0;
  }

  async function topCategories(jobId: string, numberOfCategories: number) {
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
      id: number;
      count: number;
    }> = top.aggregations?.cat_count?.buckets.map((c: any) => ({
      id: c.key,
      count: c.doc_count,
    }));

    const tempCategories = await Promise.all(catCounts.map(({ id }) => getCategories(jobId, id)));
    const categories = tempCategories
      .map((t: any) => {
        if (t.categories === undefined || t.categories.length === 0) {
          return null;
        }
        return t.categories[0];
      })
      .filter(t => t !== null);

    const catsById = categories.reduce((p, c) => {
      p[c.category_id] = c;
      return p;
    }, {} as Record<number, any>);

    const total = await getTotalCategories(jobId);
    return {
      total,
      categories: catCounts.map(({ id, count }) => {
        return {
          count,
          category: catsById[id] ?? null,
        };
      }),
    };
  }

  return {
    categorizationExamples,
    topCategories,
  };
}
