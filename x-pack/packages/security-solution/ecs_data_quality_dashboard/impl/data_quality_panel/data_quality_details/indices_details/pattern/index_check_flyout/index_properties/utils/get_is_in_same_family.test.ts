/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIsInSameFamily } from './get_is_in_same_family';

describe('getIsInSameFamily', () => {
  test('it returns false when ecsExpectedType is undefined', () => {
    expect(getIsInSameFamily({ ecsExpectedType: undefined, type: 'keyword' })).toBe(false);
  });

  const expectedFamilyMembers: {
    [key: string]: string[];
  } = {
    constant_keyword: ['keyword', 'wildcard'], // `keyword` and `wildcard` in the same family as `constant_keyword`
    keyword: ['constant_keyword', 'wildcard'],
    match_only_text: ['text'],
    text: ['match_only_text'],
    wildcard: ['keyword', 'constant_keyword'],
  };

  const ecsExpectedTypes = Object.keys(expectedFamilyMembers);

  ecsExpectedTypes.forEach((ecsExpectedType) => {
    const otherMembersOfSameFamily = expectedFamilyMembers[ecsExpectedType];

    otherMembersOfSameFamily.forEach((type) =>
      test(`it returns true for ecsExpectedType '${ecsExpectedType}' when given '${type}', a type in the same family`, () => {
        expect(getIsInSameFamily({ ecsExpectedType, type })).toBe(true);
      })
    );

    test(`it returns false for ecsExpectedType '${ecsExpectedType}' when given 'date', a type NOT in the same family`, () => {
      expect(getIsInSameFamily({ ecsExpectedType, type: 'date' })).toBe(false);
    });
  });
});
