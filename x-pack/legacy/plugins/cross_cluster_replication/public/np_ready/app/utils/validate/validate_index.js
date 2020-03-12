/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from '../../constants';

// Names beginning with periods are reserved for system indices.
export function indexNameBeginsWithPeriod(indexName = '') {
  return indexName[0] === '.';
}

export function findIllegalCharactersInIndexName(indexName) {
  const illegalCharacters = INDEX_ILLEGAL_CHARACTERS_VISIBLE.reduce((chars, char) => {
    if (indexName.includes(char)) {
      chars.push(char);
    }

    return chars;
  }, []);

  return illegalCharacters;
}

export function indexNameContainsSpaces(indexName) {
  return indexName.includes(' ');
}
