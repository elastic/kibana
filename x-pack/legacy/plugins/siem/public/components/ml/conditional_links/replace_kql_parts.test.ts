/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { replaceKQLParts } from './replace_kql_parts';

describe('replace_kql_parts', () => {
  describe('variables only testing', () => {
    test('replacing a string with a variable $user.name$ into an empty string', () => {
      const replacement = replaceKQLParts('(query:\'user.name : "$user.name$"\',language:kuery)');
      expect(replacement).toEqual("(language:kuery,query:'')");
    });

    test('replacing a string with a variable $user.name$ and an "and" clause that does not have a variable', () => {
      const replacement = replaceKQLParts(
        '(query:\'user.name : "$user.name$" and process.name : "process-name"\',language:kuery)'
      );
      expect(replacement).toEqual('(language:kuery,query:\'process.name : "process-name"\')');
    });

    test('replacing a string with an "and" clause and a variable $user.name$', () => {
      const replacement = replaceKQLParts(
        '(query:\'process.name : "process-name" and user.name : "$user.name$"\',language:kuery)'
      );
      expect(replacement).toEqual('(language:kuery,query:\'process.name : "process-name"\')');
    });

    test('replacing a string with an "and" clause, a variable $user.name$, and then another "and" clause', () => {
      const replacement = replaceKQLParts(
        '(query:\'process.name : "process-name" and user.name : "$user.name$" and host.name : "host-1"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'process.name : "process-name" and host.name : "host-1"\')'
      );
    });

    test('replacing a string with an "and" clause, a variable $user.name$, and then another "and" clause and then another variable', () => {
      const replacement = replaceKQLParts(
        '(query:\'process.name : "process-name" and user.name : "$user.name$" and host.name : "host-1" and process.title : "$process.title$"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'process.name : "process-name" and host.name : "host-1"\')'
      );
    });

    test('replacing a string with two variables of $user.name$ and $process.name$ into an empty string', () => {
      const replacement = replaceKQLParts(
        '(query:\'user.name : "$user.name$" and process.name : "$process.name$"\',language:kuery)'
      );
      expect(replacement).toEqual("(language:kuery,query:'')");
    });

    test('replacing a string with two variables of $user.name$ and $process.name$ and an "and" clause', () => {
      const replacement = replaceKQLParts(
        '(query:\'user.name : "$user.name$" and process.name : "$process.name$" and host.name="host-1"\',language:kuery)'
      );
      expect(replacement).toEqual('(language:kuery,query:host.name="host-1")');
    });
  });

  describe('comma testing only', () => {
    test('replaces two comma separated values using an or clause', () => {
      const replacement = replaceKQLParts('(query:\'user.name : "becky,evan"\',language:kuery)');
      expect(replacement).toEqual(
        '(language:kuery,query:\'(user.name: "becky" or user.name: "evan")\')'
      );
    });

    test('replaces three comma separated values using an or clause', () => {
      const replacement = replaceKQLParts(
        '(query:\'user.name : "becky,evan,braden"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'(user.name: "becky" or user.name: "evan" or user.name: "braden")\')'
      );
    });

    test('replaces three comma separated values using an or clause with hypens for names', () => {
      const replacement = replaceKQLParts(
        '(query:\'user.name : "username-1,username-2,username-3"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'(user.name: "username-1" or user.name: "username-2" or user.name: "username-3")\')'
      );
    });

    test('replaces three comma separated values using an or clause with an additional "and" clause next to it', () => {
      const replacement = replaceKQLParts(
        '(query:\'user.name : "becky,evan,braden" and process.name:"process-name"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'(user.name: "becky" or user.name: "evan" or user.name: "braden") and process.name:"process-name"\')'
      );
    });

    test('replaces three comma separated values using an or clause with an additional "and" clause in front of it', () => {
      const replacement = replaceKQLParts(
        '(query:\'process.name:"process-name" and user.name : "becky,evan,braden"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'process.name:"process-name" and (user.name: "becky" or user.name: "evan" or user.name: "braden")\')'
      );
    });

    test('replaces three comma separated values using an or clause with an additional "and" clause in front and behind it', () => {
      const replacement = replaceKQLParts(
        '(query:\'process.name:"process-name" and user.name : "becky,evan,braden" and host.name:"host-name-1"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'process.name:"process-name" and (user.name: "becky" or user.name: "evan" or user.name: "braden") and host.name:"host-name-1"\')'
      );
    });
  });

  describe('combined tests', () => {
    test('empty string should return an empty string', () => {
      const replacement = replaceKQLParts('');
      expect(replacement).toEqual('');
    });

    test('should not replace a single empty string value', () => {
      const replacement = replaceKQLParts('(query:\'process.name : ""\',language:kuery)');
      expect(replacement).toEqual('(language:kuery,query:\'process.name : ""\')');
    });

    test('should not replace a complex string when no variables are present and no commas are present', () => {
      const replacement = replaceKQLParts(
        '(query:\'user.name : "user-1" and process.name : "process-1"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'user.name : "user-1" and process.name : "process-1"\')'
      );
    });

    test('replacing a string with a variable $user.name$ into an empty string and expand a comma separated list of items', () => {
      const replacement = replaceKQLParts(
        '(query:\'user.name : "$user.name$" and process.name : "process-name-1,process-name-2"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'(process.name: "process-name-1" or process.name: "process-name-2")\')'
      );
    });

    test('replacing a string with an "and" clause, a variable $user.name$, and then another "and" clause while expanding multiple process names and host names', () => {
      const replacement = replaceKQLParts(
        '(query:\'process.name : "process-name-1,process-name-2,process-name-3" and user.name : "$user.name$" and host.name : "host-1,host-2,host-3,host-4" and process.title : "$process.title$"\',language:kuery)'
      );
      expect(replacement).toEqual(
        '(language:kuery,query:\'(process.name: "process-name-1" or process.name: "process-name-2" or process.name: "process-name-3") and (host.name: "host-1" or host.name: "host-2" or host.name: "host-3" or host.name: "host-4")\')'
      );
    });
  });
});
