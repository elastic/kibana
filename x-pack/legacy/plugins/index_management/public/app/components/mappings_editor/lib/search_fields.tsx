/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { NormalizedFields, NormalizedField, SearchResult, SearchMetadata } from '../types';
import { ALL_DATA_TYPES } from '../constants';

interface FieldWithMeta {
  field: NormalizedField;
  metadata: SearchMetadata;
}

interface SearchData {
  term: string;
  searchRegexArray: RegExp[];
  type?: string;
}

interface FieldData {
  path: string;
  type: string;
}

const sortResult = (a: FieldWithMeta, b: FieldWithMeta) => {
  return b.metadata.score - a.metadata.score;
};

const calculateScore = (metadata: Omit<SearchMetadata, 'score' | 'display'>): number => {
  let score = 0;

  if (metadata.matchPath) {
    score += 15;
  }

  if (metadata.matchStartOfPath) {
    score += 5;
  }

  if (metadata.fullyMatchPath) {
    score += 5;
  }

  if (metadata.matchType) {
    score += 5;
  }

  if (metadata.fullyMatchType) {
    score += 5;
  }

  return score;
};

const getJSXdisplayFromMeta = (
  searchData: SearchData,
  fieldData: FieldData,
  metadata: Omit<SearchMetadata, 'score' | 'display'>
): JSX.Element => {
  const { term } = searchData;
  const { path } = fieldData;

  let display: JSX.Element = <span>{path}</span>;

  if (metadata.fullyMatchPath) {
    display = (
      <span>
        <strong>{path}</strong>
      </span>
    );
  } else if (metadata.matchStartOfPath) {
    const endString = path.substr(term.length, path.length);
    display = (
      <span>
        <strong>{term}</strong>
        {endString}
      </span>
    );
  } else if (metadata.matchPath) {
    // Execute all the regEx and sort them with the one that has the most
    // characters match first.
    const stringMatch = searchData.searchRegexArray
      .map(regex => regex.exec(path))
      .filter(Boolean)
      .sort((a, b) => b![0].length - a![0].length)[0]![0];

    const charIndex = path.toLowerCase().indexOf(stringMatch.toLowerCase());
    const startString = path.substr(0, charIndex);
    const endString = path.substr(charIndex + stringMatch.length);
    display = (
      <span>
        {startString}
        <strong>{stringMatch}</strong>
        {endString}
      </span>
    );
  }

  return display;
};

const getSearchMetadata = (searchData: SearchData, fieldData: FieldData): SearchMetadata => {
  const { term, type, searchRegexArray } = searchData;
  const typeToCompare = type ?? term;

  const matchStartOfPath = fieldData.path.startsWith(term);

  const metadata = {
    matchPath: searchRegexArray.some(searchRegex => searchRegex.test(fieldData.path)),
    matchStartOfPath,
    fullyMatchPath: term === fieldData.path,
    matchType: fieldData.type.includes(typeToCompare),
    fullyMatchType: typeToCompare === fieldData.type,
  };

  const score = calculateScore(metadata);
  const display = getJSXdisplayFromMeta(searchData, fieldData, metadata);

  return {
    ...metadata,
    display,
    score,
  };
};

/**
 * Return an array of array combining sibling elements
 * In: ['A', 'B', 'C', 'D']
 * Out: [['A', 'B'], ['B', 'C'], ['C', 'D']]
 *
 * @param arr Array of string
 */
const getSubArrays = (arr: string[]): string[][] => {
  let i = 0;
  const result = [];
  while (i < arr.length - 1) {
    result.push([arr[i], arr[i + 1]]);
    i++;
  }
  return result;
};

const getRegexFromArray = (array: string[]): RegExp[] => {
  const termsRegexArray = array.map(value => new RegExp(value, 'i'));
  const fuzzyJoinChar = '[_\\.-\\s]?';
  const fuzzySearchRegexArray = getSubArrays(array).map(
    ([A, B]) => new RegExp(A + fuzzyJoinChar + B, 'i')
  );
  const regexArray = [...termsRegexArray, ...fuzzySearchRegexArray];

  return regexArray;
};

/**
 * We will parsre the term to check if the _first_ or _last_ word matches a field "type"
 *
 * @param term The term introduced in the search box
 */
const parseSearchTerm = (term: string): SearchData => {
  let type: string | undefined;
  const parsedTerm = term.replace(/\s+/g, ' ').trim(); // Remove multiple spaces with 1 single space

  const words = parsedTerm.split(' ');
  const searchRegexArray = getRegexFromArray(words);

  const firstWordIsType = ALL_DATA_TYPES.includes(words[0]);
  const lastWordIsType = ALL_DATA_TYPES.includes(words[words.length - 1]);

  if (firstWordIsType) {
    type = words[0];
  } else if (lastWordIsType) {
    type = words[words.length - 1];
  }

  return { term: parsedTerm, type, searchRegexArray };
};

export const searchFields = (term: string, fields: NormalizedFields['byId']): SearchResult[] => {
  const searchData = parseSearchTerm(term);

  return Object.values(fields)
    .map(field => ({
      field,
      metadata: getSearchMetadata(searchData, { path: field.path, type: field.source.type }),
    }))
    .filter(({ metadata }) => metadata.score > 0)
    .sort(sortResult)
    .map(({ field, metadata: { display } }) => ({
      display,
      field,
    }));
};
