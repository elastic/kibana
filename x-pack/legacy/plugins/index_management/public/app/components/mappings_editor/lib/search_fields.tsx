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
  term: string,
  path: string,
  metadata: Omit<SearchMetadata, 'score' | 'display'>
): JSX.Element => {
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
    const words = term.split(' ');
    const matchWord = words[metadata.wordMatchIndex];
    const charIndex = path.indexOf(matchWord);
    const startString = path.substr(0, charIndex);
    const endString = path.substr(charIndex + matchWord.length);

    display = (
      <span>
        {startString}
        <strong>{matchWord}</strong>
        {endString}
      </span>
    );
  }

  return display;
};

const getSearchMetadata = (term: string, field: NormalizedField, type?: string): SearchMetadata => {
  const typeToCompare = type ?? term;

  const words = term.split(' ');
  const hasMultipleWords = words.length > 1;

  const matchStartOfPath = field.path.startsWith(term);
  const wordMatchIndex = hasMultipleWords
    ? words.reduce((acc, word, index) => {
        if (acc >= 0) {
          // We already have a match, exit
          return acc;
        }
        // Test with insensitive case if the word match the field path
        if (new RegExp(word, 'gi').test(field.path)) {
          acc = index;
        }
        return acc;
      }, -1)
    : field.path.includes(term)
    ? 0
    : -1;

  const metadata = {
    matchPath: wordMatchIndex >= 0,
    matchStartOfPath,
    fullyMatchPath: term === field.path,
    matchType: field.source.type.includes(typeToCompare),
    fullyMatchType: typeToCompare === field.source.type,
    wordMatchIndex,
  };

  const score = calculateScore(metadata);

  // console.log(score, term, field.path, metadata);

  const display = getJSXdisplayFromMeta(term, field.path, metadata);

  return {
    ...metadata,
    display,
    score,
  };
};

/**
 * We will parsre the term to check if the _first_ or _last_ word matches a field "type"
 *
 * @param term The term introduced in the search box
 */
const parseSearchTerm = (term: string): { type?: string; parsedTerm: string } => {
  let type: string | undefined;
  let parsedTerm = term.replace(/\s+/g, ' '); // Remove multiple spaces with 1 single space

  const words = parsedTerm.split(' ');
  const firstWordIsType = ALL_DATA_TYPES.includes(words[0]);
  const lastWordIsType = ALL_DATA_TYPES.includes(words[words.length - 1]);

  if (firstWordIsType) {
    type = words[0];
    words.shift();
    parsedTerm = parsedTerm.substr((parsedTerm.length - type.length) * -1);
  } else if (lastWordIsType) {
    type = words[words.length - 1];
    words.pop();
    parsedTerm = parsedTerm.substr(0, parsedTerm.length - type.length);
  }

  return { parsedTerm: parsedTerm.trim(), type };
};

export const searchFields = (term: string, fields: NormalizedFields['byId']): SearchResult[] => {
  const { parsedTerm, type } = parseSearchTerm(term);

  return Object.values(fields)
    .map(field => ({
      field,
      metadata: getSearchMetadata(parsedTerm, field, type),
    }))
    .filter(({ metadata }) => metadata.score > 0)
    .sort(sortResult)
    .map(({ field, metadata: { display } }) => ({
      display,
      field,
    }));
};
