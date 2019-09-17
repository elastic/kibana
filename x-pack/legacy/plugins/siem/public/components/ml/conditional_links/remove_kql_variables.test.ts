/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { removeKqlVariables, removeKqlVariablesUsingRegex, replacer } from './remove_kql_variables';

describe('remove_kql_variables', () => {
  describe('replacer function', () => {
    test("should return empty string when passed `undefined` for 'parts'", () => {
      let fakeParts; // test with 'undefined'
      const replacedResult = replacer(' and user.name: "$user.name$"', fakeParts);
      expect(replacedResult).toEqual('');
    });
    test("should return empty string when passed null for 'parts' parameter", () => {
      const replacedResult = replacer(' and user.name: "$user.name$"', null);
      expect(replacedResult).toEqual('');
    });
  });
  describe('removeKqlVariablesUsingRegex function', () => {
    test('should return replaced variables', () => {
      const removedString = removeKqlVariablesUsingRegex(
        'user.name : "$user.name$" and process.name : "$process.name$" and host.name="host-1"'
      );
      expect(removedString).toEqual('host.name="host-1"');
    });
  });
  test('should not replace a single empty string value', () => {
    const replacement = removeKqlVariables(
      '(filterQuery:(expression:\'process.name : ""\',kind:kuery))'
    );
    expect(replacement).toEqual('(filterQuery:(expression:\'process.name : ""\',kind:kuery))');
  });

  test('should not replace a complex string when no variables are present', () => {
    const replacement = removeKqlVariables(
      '(filterQuery:(expression:\'user.name : "user-1" and process.name : "process-1"\',kind:kuery))'
    );
    expect(replacement).toEqual(
      '(filterQuery:(expression:\'user.name : "user-1" and process.name : "process-1"\',kind:kuery))'
    );
  });

  test('replacing a string with a variable $user.name$ into an empty string', () => {
    const replacement = removeKqlVariables(
      '(filterQuery:(expression:\'user.name : "$user.name$"\',kind:kuery))'
    );
    expect(replacement).toEqual("(filterQuery:(expression:'',kind:kuery))");
  });

  test('replacing a string with a variable $user.name$ and an "and" clause that does not have a variable', () => {
    const replacement = removeKqlVariables(
      '(filterQuery:(expression:\'user.name : "$user.name$" and process.name : "process-name"\',kind:kuery))'
    );
    expect(replacement).toEqual(
      '(filterQuery:(expression:\'process.name : "process-name"\',kind:kuery))'
    );
  });

  test('replacing a string with an "and" clause and a variable $user.name$', () => {
    const replacement = removeKqlVariables(
      '(filterQuery:(expression:\'process.name : "process-name" and user.name : "$user.name$"\',kind:kuery))'
    );
    expect(replacement).toEqual(
      '(filterQuery:(expression:\'process.name : "process-name"\',kind:kuery))'
    );
  });

  test('replacing a string with an "and" clause, a variable $user.name$, and then another "and" clause', () => {
    const replacement = removeKqlVariables(
      '(filterQuery:(expression:\'process.name : "process-name" and user.name : "$user.name$" and host.name : "host-1"\',kind:kuery))'
    );
    expect(replacement).toEqual(
      '(filterQuery:(expression:\'process.name : "process-name" and host.name : "host-1"\',kind:kuery))'
    );
  });

  test('replacing a string with an "and" clause, a variable $user.name$, and then another "and" clause and then another variable', () => {
    const replacement = removeKqlVariables(
      '(filterQuery:(expression:\'process.name : "process-name" and user.name : "$user.name$" and host.name : "host-1" and process.title : "$process.title$"\',kind:kuery))'
    );
    expect(replacement).toEqual(
      '(filterQuery:(expression:\'process.name : "process-name" and host.name : "host-1"\',kind:kuery))'
    );
  });

  test('replacing a string with two variables of $user.name$ and $process.name$ into an empty string', () => {
    const replacement = removeKqlVariables(
      '(filterQuery:(expression:\'user.name : "$user.name$" and process.name : "$process.name$"\',kind:kuery))'
    );
    expect(replacement).toEqual("(filterQuery:(expression:'',kind:kuery))");
  });

  test('replacing a string with two variables of $user.name$ and $process.name$ and an "and" clause', () => {
    const replacement = removeKqlVariables(
      '(filterQuery:(expression:\'user.name : "$user.name$" and process.name : "$process.name$" and host.name="host-1"\',kind:kuery))'
    );
    expect(replacement).toEqual('(filterQuery:(expression:host.name="host-1",kind:kuery))');
  });

  test('empty string should return an empty string', () => {
    const replacement = removeKqlVariables('');
    expect(replacement).toEqual('');
  });
});
