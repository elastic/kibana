/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chunk } from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { CATEGORY_EXAMPLES_SAMPLE_SIZE } from '../../../../../common/constants/new_job';
import {
  Token,
  CategorizationAnalyzer,
  CategoryFieldExample,
} from '../../../../../common/types/categories';
import { callWithRequestType } from '../../../../../common/types/kibana';
import { ValidationResults } from './validation_results';

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

    const results: SearchResponse<{ [id: string]: string }> = await callWithRequest('search', {
      index: indexPatternTitle,
      size,
      body: {
        _source: categorizationFieldName,
        query,
        sort: ['_doc'],
      },
    });

    const tempExamples = results.hits.hits.map(({ _source }) => _source[categorizationFieldName]);

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
        return { examples: halfExamples.map(e => ({ text: e, tokens: [] })) };
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

    const { examples } = resp;
    const sampleSize = examples.length;
    validationResults.createTokenCountResult(examples, sampleSize);

    // sort examples by number of tokens, keeping track of their original order
    // with an origIndex property
    const sortedExamples = examples
      .map((e, i) => ({ ...e, origIndex: i }))
      .sort((a, b) => b.tokens.length - a.tokens.length);

    // we only want 'size' (e.g. 5) number of examples,
    // so loop through the sorted examples, taking 5 at evenly
    // spread intervals
    const multiple = Math.floor(sampleSize / size) || sampleSize;
    const filteredExamples = [];
    let i = 0;
    while (filteredExamples.length < size && i < sampleSize) {
      filteredExamples.push(sortedExamples[i]);
      i += multiple;
    }

    // sort back into original order and remove origIndex property
    const processedExamples = filteredExamples
      .sort((a, b) => a.origIndex - b.origIndex)
      .map(e => ({ text: e.text, tokens: e.tokens }));

    return {
      overallValidStatus: validationResults.overallResult,
      validationChecks: validationResults.results,
      sampleSize,
      examples: processedExamples,
    };
  }

  return {
    validateCategoryExamples,
  };
}
