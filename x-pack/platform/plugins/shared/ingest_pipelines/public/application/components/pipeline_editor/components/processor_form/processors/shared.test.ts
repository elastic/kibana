/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidationFuncArg } from '@kbn/console-plugin/public/shared_imports';
import { from, isXJsonField, to } from './shared';

describe('shared', () => {
  describe('deserialization helpers', () => {
    // This is the text that will be passed to the text input
    test('to.escapeBackslashes', () => {
      // this input loaded from the server
      const input1 = 'my\ttab';
      expect(to.escapeBackslashes(input1)).toBe('my\\ttab');

      // this input loaded from the server
      const input2 = 'my\\ttab';
      expect(to.escapeBackslashes(input2)).toBe('my\\\\ttab');

      // this input loaded from the server
      const input3 = '\t\n\rOK';
      expect(to.escapeBackslashes(input3)).toBe('\\t\\n\\rOK');

      const input4 = `%{clientip} %{ident} %{auth} [%{@timestamp}] \"%{verb} %{request} HTTP/%{httpversion}\" %{status} %{size}`;
      expect(to.escapeBackslashes(input4)).toBe(
        '%{clientip} %{ident} %{auth} [%{@timestamp}] \\"%{verb} %{request} HTTP/%{httpversion}\\" %{status} %{size}'
      );
    });
    test('to.xJsonString', () => {
      const input1 = '';
      expect(to.xJsonString(input1)).toBe('{}');

      // eslint-disable-next-line prettier/prettier
      const input2 = '{"ISSUE": "aaa\"bbb","ISSUE2": "aaa\\(bbb","ISSUE3": """aaa\"bbb"""}';
      expect(to.xJsonString(input2)).toBe(
        // eslint-disable-next-line prettier/prettier
        '{"ISSUE": "aaa\"bbb","ISSUE2": "aaa\\(bbb","ISSUE3": """aaa\"bbb"""}'
      );

      // eslint-disable-next-line prettier/prettier
      const input3 = { ISSUE: "aaa\"bbb", ISSUE2: "aaa\\(bbb" };
      expect(to.xJsonString(input3)).toBe(JSON.stringify(input3, null, 2));
    });
  });

  describe('serialization helpers', () => {
    test('from.unescapeBackslashes', () => {
      // user typed in "my\ttab"
      const input1 = 'my\\ttab';
      expect(from.unescapeBackslashes(input1)).toBe('my\ttab');

      // user typed in "my\\tab"
      const input2 = 'my\\\\ttab';
      expect(from.unescapeBackslashes(input2)).toBe('my\\ttab');

      // user typed in "\t\n\rOK"
      const input3 = '\\t\\n\\rOK';
      expect(from.unescapeBackslashes(input3)).toBe('\t\n\rOK');

      const input5 = `%{clientip} %{ident} %{auth} [%{@timestamp}] \\"%{verb} %{request} HTTP/%{httpversion}\\" %{status} %{size}`;
      expect(from.unescapeBackslashes(input5)).toBe(
        `%{clientip} %{ident} %{auth} [%{@timestamp}] \"%{verb} %{request} HTTP/%{httpversion}\" %{status} %{size}`
      );
    });
    test('from.optionalXJson', () => {
      const input1 = '';
      expect(from.optionalXJson(input1)).toBe(undefined);

      const input2 = '{}';
      expect(from.optionalXJson(input2)).toBe(undefined);

      const input3 = '{"ISSUE": "aaa","ISSUE2": "bbb"}';
      expect(from.optionalXJson(input3)).toBe(input3);
    });
  });
  describe('validators', () => {
    test('isXJsonField', () => {
      const message = 'test error message';
      const code = 'ERR_JSON_FORMAT';

      const validate = isXJsonField(message);
      const validator = (value: unknown) => validate({ value } as ValidationFuncArg<any, any>);

      // Valid JSON
      const input1 = '{"ISSUE": """aaa"bbb""", "ISSUE2": """aaa\bbb"""}';
      expect(validator(input1)).toBeUndefined();

      // Invalid JSON
      // eslint-disable-next-line prettier/prettier
      const input2 = '{"ISSUE": """"aaa\"bbb""';
      expect(validator(input2)).toMatchObject({ message, code });
    });
  });
});
