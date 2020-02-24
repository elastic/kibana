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
  terms: string[];
  searchRegexArray: RegExp[];
  type?: string;
}

interface FieldData {
  name: string;
  path: string;
  type: string;
}

/**
 * Copied from https://stackoverflow.com/a/9310752
 */
const escapeRegExp = (text: string) => {
  return text.replace(/[-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

const sortResult = (a: FieldWithMeta, b: FieldWithMeta) => {
  if (a.metadata.score > b.metadata.score) {
    return -1;
  } else if (b.metadata.score > a.metadata.score) {
    return 1;
  }
  if (a.metadata.stringMatch === null) {
    return 1;
  } else if (b.metadata.stringMatch === null) {
    return -1;
  }

  // With a match and the same score,...

  if (a.metadata.matchFieldName && b.metadata.matchFieldName) {
    // The field with the shortest name comes first
    // So searching "nam" would bring "name" before "namespace"
    return a.field.source.name.length - b.field.source.name.length;
  }

  if (a.metadata.stringMatch.length === b.metadata.stringMatch.length) {
    // The field with the shortest path (less tree "depth") comes first
    return a.field.path.length - b.field.path.length;
  }

  // The longest match string wins.
  return b.metadata.stringMatch.length - a.metadata.stringMatch.length;
};

const calculateScore = (metadata: Omit<SearchMetadata, 'score' | 'display'>): number => {
  let score = 0;

  if (metadata.fullyMatchFieldName) {
    score += 15;
  }

  if (metadata.matchFieldName) {
    score += 5;
  }

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
      <span style={{ lineHeight: 1.5 }}>
        <strong>{path}</strong>
      </span>
    );
  } else if (metadata.matchStartOfPath) {
    const endString = path.substr(term.length, path.length);
    display = (
      <span style={{ lineHeight: 1.5 }}>
        <strong>{term}</strong>
        {endString}
      </span>
    );
  } else if (metadata.matchPath) {
    const { stringMatch } = metadata;
    const charIndex = path.lastIndexOf(stringMatch!);
    const startString = path.substr(0, charIndex);
    const endString = path.substr(charIndex + stringMatch!.length);

    display = (
      <span style={{ lineHeight: 1.5 }}>
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

  const fullyMatchFieldName = term === fieldData.name;
  const fullyMatchPath = term === fieldData.path;
  const fieldNameRegMatch = searchRegexArray[0].exec(fieldData.name);
  const matchFieldName = fullyMatchFieldName ? true : fieldNameRegMatch !== null;
  const matchStartOfPath = fieldData.path.startsWith(term);
  const matchType = fieldData.type.includes(typeToCompare);
  const fullyMatchType = typeToCompare === fieldData.type;

  let stringMatch: string | null = null;

  if (fullyMatchPath) {
    stringMatch = fieldData.path;
  } else if (matchFieldName) {
    stringMatch = fullyMatchFieldName ? fieldData.name : fieldNameRegMatch![0];
  } else {
    // Execute all the regEx and sort them with the one that has the most
    // characters match first.
    const arrayMatch = searchRegexArray
      .map(regex => regex.exec(fieldData.path))
      .filter(Boolean)
      .sort((a, b) => b![0].length - a![0].length);

    if (arrayMatch.length) {
      stringMatch = arrayMatch[0]![0];
    }
  }

  const matchPath = stringMatch !== null;

  const metadata = {
    matchFieldName,
    matchPath,
    matchStartOfPath,
    fullyMatchPath,
    matchType,
    fullyMatchFieldName,
    fullyMatchType,
    stringMatch,
  };

  const score = calculateScore(metadata);
  const display = getJSXdisplayFromMeta(searchData, fieldData, metadata);

  // console.log(fieldData.path, score, metadata);

  return {
    ...metadata,
    display,
    score,
  };
};

const getRegexArrayFromSearchTerms = (searchTerms: string[]): RegExp[] => {
  const fuzzyJoinChar = '([\\._-\\s]|(\\s>\\s))?';

  return [new RegExp(searchTerms.join(fuzzyJoinChar), 'i')];
};

/**
 * We will parsre the term to check if the _first_ or _last_ word matches a field "type"
 *
 * @param term The term introduced in the search box
 */
const parseSearchTerm = (term: string): SearchData => {
  let type: string | undefined;
  let parsedTerm = term.replace(/\s+/g, ' ').trim(); // Remove multiple spaces with 1 single space

  const words = parsedTerm.split(' ').map(escapeRegExp);

  // We don't take into account if the last word is a ">" char
  if (words[words.length - 1] === '>') {
    words.pop();
    parsedTerm = words.join(' ');
  }

  const searchRegexArray = getRegexArrayFromSearchTerms(words);

  const firstWordIsType = ALL_DATA_TYPES.includes(words[0]);
  const lastWordIsType = ALL_DATA_TYPES.includes(words[words.length - 1]);

  if (firstWordIsType) {
    type = words[0];
  } else if (lastWordIsType) {
    type = words[words.length - 1];
  }

  return { term: parsedTerm, terms: words, type, searchRegexArray };
};

export const searchFields = (term: string, fields: NormalizedFields['byId']): SearchResult[] => {
  const searchData = parseSearchTerm(term);

  // An empty string means that we have searched for ">" and that is has been
  // stripped out. So we exit early with an empty result.
  if (searchData.term === '') {
    return [];
  }

  return Object.values(fields)
    .map(field => ({
      field,
      metadata: getSearchMetadata(searchData, {
        name: field.source.name,
        path: field.path.join(' > '),
        type: field.source.type,
      }),
    }))
    .filter(({ metadata }) => metadata.score > 0)
    .sort(sortResult)
    .map(({ field, metadata: { display } }) => ({
      display,
      field,
    }));
};
