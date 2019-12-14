/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkIndexPatternValid } from './indexing_service';

describe('indexing_service', () => {
  const validNames = [
    'lowercaseletters', // Lowercase only
    '123', // Cannot include \, /, *, ?, ", <, >, |, " " (space character), , (comma), #
    'does_not_start_with_underscores', // Cannot start with _
    'does-not-start-with-a-dash', // Cannot start with -
    'does+not+start+with+a+plus', // Cannot start with +
    'is..not..just..two..periods', // name can't be ..
    'is.not.just.one.period', // name can't be .
    'x'.repeat(255), // Cannot be longer than 255 bytes
  ];
  validNames.forEach(validName => {
    it(`Should validate index pattern: "${validName}"`, () => {
      const isValid = checkIndexPatternValid(validName);
      expect(isValid).toEqual(true);
    });
  });

  const inValidNames = [
    'someUpperCaseLetters', // Lowercase only
    '1\\2\\3', // Cannot include \
    '1/2/3', // Cannot include /
    '1*2*3', // Cannot include *
    '1?2?3', // Cannot include ?
    '1"2"3', // Cannot include "
    '1<2<3', // Cannot include <
    '1>2>3', // Cannot include >
    '1|2|3', // Cannot include |
    '1 2 3', // Cannot include space character
    '1,2,3', // Cannot include ,
    '1#2#3', // Cannot include #
    '_starts_with_underscores', // Cannot start with _
    '-starts-with-a-dash', // Cannot start with -
    '+starts+with+a+plus', // Cannot start with +
    '..', // name can't be ..
    '.', // name can't be .
    'x'.repeat(256), // Cannot be longer than 255 bytes
    'ü'.repeat(128), // Cannot be longer than 255 bytes (using 2 byte char)
  ];
  inValidNames.forEach(inValidName => {
    it(`Should invalidate index pattern: "${inValidName}"`, () => {
      const isValid = checkIndexPatternValid(inValidName);
      expect(isValid).toEqual(false);
    });
  });
});
