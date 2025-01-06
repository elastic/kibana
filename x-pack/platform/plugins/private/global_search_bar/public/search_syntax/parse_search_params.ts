/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@elastic/eui';
import { getSearchTerm, getFieldValueMap, applyAliases } from './query_utils';
import { FilterValues, ParsedSearchParams } from './types';

const knownFilters = ['tag', 'type'];

const aliasMap = {
  tag: ['tags'],
  type: ['types'],
};

// Converts multiword types to phrases by wrapping them in quotes and trimming whitespace after type keyword. Example: type:  canvas workpad -> type:"canvas workpad". If the type is already wrapped in quotes or is a single word, it will only trim whitespace after type keyword.
const convertMultiwordTypesToPhrasesAndTrimWhitespace = (
  term: string,
  multiWordTypes: string[]
): string => {
  if (!multiWordTypes.length) {
    return term.replace(
      /(type:|types:)\s*([^"']*?)\b([^"'\s]+)/gi,
      (_, typeKeyword, whitespace, typeValue) => `${typeKeyword}${whitespace.trim()}${typeValue}`
    );
  }

  const typesPattern = multiWordTypes.join('|');
  const termReplaceRegex = new RegExp(
    `(type:|types:)\\s*([^"']*?)\\b((${typesPattern})\\b|[^\\s"']+)`,
    'gi'
  );

  return term.replace(termReplaceRegex, (_, typeKeyword, whitespace, typeValue) => {
    const trimmedTypeKeyword = `${typeKeyword}${whitespace.trim()}`;

    // If the type value is already wrapped in quotes, leave it as is
    return /['"]/.test(typeValue)
      ? `${trimmedTypeKeyword}${typeValue}`
      : `${trimmedTypeKeyword}"${typeValue}"`;
  });
};

const dedupeTypes = (types: FilterValues<string>): FilterValues<string> => [
  ...new Set(types.map((item) => item.replace(/[-\s]+/g, ' ').trim())),
];

export const parseSearchParams = (term: string, searchableTypes: string[]): ParsedSearchParams => {
  const recognizedFields = knownFilters.concat(...Object.values(aliasMap));
  let query: Query;

  // Finds all multiword types that are separated by whitespace or hyphens
  const multiWordSearchableTypesWhitespaceSeperated = searchableTypes
    .filter((item) => /[ -]/.test(item))
    .map((item) => item.replace(/-/g, ' '));

  const modifiedTerm = convertMultiwordTypesToPhrasesAndTrimWhitespace(
    term,
    multiWordSearchableTypesWhitespaceSeperated
  );

  try {
    query = Query.parse(modifiedTerm, {
      schema: { recognizedFields },
    });
  } catch (e) {
    // if the query fails to parse, we just perform the search against the raw search term.
    return {
      term,
      filters: {},
    };
  }

  const searchTerm = getSearchTerm(query);
  const filterValues = applyAliases(getFieldValueMap(query), aliasMap);

  const tags = filterValues.get('tag');
  const types = filterValues.get('type');

  return {
    term: searchTerm,
    filters: {
      tags: tags ? valuesToString(tags) : undefined,
      types: types ? dedupeTypes(valuesToString(types)) : undefined,
    },
  };
};

const valuesToString = (raw: FilterValues): FilterValues<string> =>
  raw.map((value) => String(value));
