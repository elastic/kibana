/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chunk } from 'lodash';
import { CATEGORY_EXAMPLES_SAMPLE_SIZE } from '../../../../../common/constants/new_job';
import {
  Token,
  CategorizationAnalyzer,
  CategoryFieldExample,
} from '../../../../../common/types/categories';
import { callWithRequestType } from '../../../../../common/types/kibana';
import { ValidationResults } from './validation_results';

const VALID_TOKEN_COUNT = 3;
const CHUNK_SIZE = 100;

export function categorizationExamplesProvider(callWithRequest: callWithRequestType) {
  const validationResults = new ValidationResults();

  async function categorizationExamples(
    indexPatternTitle: string,
    query: any,
    size: number,
    categorizationFieldName: string,
    timeField: string | undefined,
    start: number,
    end: number,
    analyzer: CategorizationAnalyzer
  ): Promise<{ examples: CategoryFieldExample[]; error?: any }> {
    if (timeField !== undefined) {
      const range = {
        range: {
          [timeField]: {
            gte: start,
            lt: end,
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
        sort: ['_doc'],
      },
    });

    const tempExamples: string[] = results.hits?.hits?.map(
      (doc: any) => doc._source[categorizationFieldName]
    );

    validationResults.createNullValueResult(tempExamples);

    const allExamples = tempExamples.filter(
      (example: string | null | undefined) => example !== undefined && example !== null
    );

    validationResults.createMedianMessageLengthResult(allExamples);

    try {
      const examplesWithTokens = await getTokens(CHUNK_SIZE, allExamples, analyzer);
      return { examples: examplesWithTokens };
    } catch (err) {
      // console.log('dropping to 50 chunk size');
      // if an error is thrown when loading the tokens, lower the chunk size by half and try again
      // the error may have been caused by too many tokens being found.
      // the _analyze endpoint has a maximum of 10000 tokens.
      const halfExamples = allExamples.splice(0, Math.ceil(allExamples.length / 2));
      const halfChunkSize = CHUNK_SIZE / 2;
      try {
        const examplesWithTokens = await getTokens(halfChunkSize, halfExamples, analyzer);
        return { examples: examplesWithTokens };
      } catch (error) {
        validationResults.createTooManyTokensResult(error, halfChunkSize);
        return { examples: halfExamples.map((e, i) => ({ text: e, tokens: [] })) };
      }
    }
  }

  async function getTokens(
    chunkSize: number,
    examples: string[],
    analyzer: CategorizationAnalyzer
  ): Promise<CategoryFieldExample[]> {
    const exampleChunks = chunk(examples, chunkSize);
    const tokensPerExampleChunks: Token[][][] = [];
    for (const c of exampleChunks) {
      tokensPerExampleChunks.push(await loadTokens(c, analyzer));
    }
    const tokensPerExample = tokensPerExampleChunks.flat();
    return examples.map((e, i) => ({ text: e, tokens: tokensPerExample[i] }));
  }

  async function loadTokens(examples: string[], analyzer: CategorizationAnalyzer) {
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

  function getAnalyzer(analyzer: CategorizationAnalyzer) {
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
    analyzer: CategorizationAnalyzer
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

    const sortedExamples = resp.examples
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

    const percentValid =
      sortedExamples.length === 0 ? 0 : validExamples.length / sortedExamples.length;

    validationResults.createTokenCountResult(percentValid, sampleSize);

    return {
      overallValidStatus: validationResults.overallResult,
      validationChecks: validationResults.results,
      sampleSize,
      percentValid: sortedExamples.length === 0 ? 0 : validExamples.length / sortedExamples.length,
      examples,
    };
  }

  return {
    validateCategoryExamples,
  };
}
