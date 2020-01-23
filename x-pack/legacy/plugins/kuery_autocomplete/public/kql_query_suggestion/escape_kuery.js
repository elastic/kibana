/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow } from 'lodash';

export function escapeQuotes(string) {
  return string.replace(/"/g, '\\"');
}

export const escapeKuery = flow(escapeSpecialCharacters, escapeAndOr, escapeNot, escapeWhitespace);

// See the SpecialCharacter rule in kuery.peg
function escapeSpecialCharacters(string) {
  return string.replace(/[\\():<>"*]/g, '\\$&'); // $& means the whole matched string
}

// See the Keyword rule in kuery.peg
function escapeAndOr(string) {
  return string.replace(/(\s+)(and|or)(\s+)/gi, '$1\\$2$3');
}

function escapeNot(string) {
  return string.replace(/not(\s+)/gi, '\\$&');
}

// See the Space rule in kuery.peg
function escapeWhitespace(string) {
  return string
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}
