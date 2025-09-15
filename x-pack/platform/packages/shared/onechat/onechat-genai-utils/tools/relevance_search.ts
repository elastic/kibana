/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel } from '@kbn/onechat-server';
import type { MatchResult } from './steps';
import { performMatchSearch, scoreRelevance, RelevanceScore } from './steps';
import type { MappingField } from './utils';
import { resolveResource } from './utils/resources';

export interface RelevanceSearchResult {
  /** id of the doc */
  id: string;
  /** index the doc is coming from */
  index: string;
  /** relevant content which was found on the doc */
  content: Record<string, string>;
}

export interface RelevanceSearchResponse {
  results: RelevanceSearchResult[];
}

export const relevanceSearch = async ({
  term,
  target,
  size = 10,
  relevanceFiltering = true,
  relevanceThreshold = RelevanceScore.Context,
  model,
  esClient,
}: {
  term: string;
  target: string;
  size?: number;
  relevanceFiltering?: boolean;
  relevanceThreshold?: RelevanceScore;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<RelevanceSearchResponse> => {
  const { fields } = await resolveResource({ resourceName: target, esClient });

  const selectedFields = fields.filter(
    (field) => field.type === 'text' || field.type === 'semantic_text'
  );

  const matchResult = await performMatchSearch({
    term,
    index: target,
    fields: selectedFields,
    size,
    esClient,
  });
  let results = convertRawResult({ results: matchResult.results, fields: selectedFields });

  if (relevanceFiltering && results.length > 0) {
    results = await filterResultsByRelevance({
      results,
      model,
      term,
      threshold: relevanceThreshold,
    });
  }

  return { results };
};

const convertRawResult = ({
  results,
  fields,
}: {
  results: MatchResult[];
  fields: MappingField[];
}): RelevanceSearchResult[] => {
  const fieldMap = fields.reduce((c, field) => {
    c[field.path] = field.type;
    return c;
  }, {} as Record<string, string>);
  return results.map<RelevanceSearchResult>((result) => {
    const matchFields =
      Object.keys(result.highlights).length > 0
        ? Object.keys(result.highlights)
        : fields.map((field) => field.path);
    const content = matchFields.reduce((c, field) => {
      const fieldType = fieldMap[field] ?? 'text';
      c[field] =
        fieldType === 'semantic_text' &&
        result.highlights[field] &&
        result.highlights[field].length > 0
          ? result.highlights[field].join('\n\n')
          : (result.content[field] as string);
      return c;
    }, {} as Record<string, string>);
    return {
      id: result.id,
      index: result.index,
      content,
    };
  });
};

const filterResultsByRelevance = async ({
  term,
  results: unfilteredResults,
  threshold,
  model,
}: {
  term: string;
  results: RelevanceSearchResult[];
  threshold: RelevanceScore;
  model: ScopedModel;
}): Promise<RelevanceSearchResult[]> => {
  const resources = unfilteredResults.map((result) => {
    return {
      content: result.content,
    };
  });
  const relevanceScores = await scoreRelevance({
    query: term,
    resources,
    model,
  });
  return unfilteredResults.filter((result, idx) => {
    const resultScore = relevanceScores[idx];
    return resultScore.score >= threshold;
  });
};
