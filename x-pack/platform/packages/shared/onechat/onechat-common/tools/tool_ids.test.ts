/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toolIdRegexp } from './tool_ids';

describe('toolId regexp', () => {
  const validToolIds = [
    'mytool',
    'core.mytool',
    'core.foo.mytool',
    'a',
    'a.b',
    'tool_1',
    'tool-1',
    'foo_bar-baz.qux_123',
    'a1.b2.c3',
    'abc.def_ghi-jkl.mno',
  ];

  const invalidToolIds = [
    '', // empty string
    '.mytool', // starts with dot
    'mytool.', // ends with dot
    'core..mytool', // double dot
    'MyTool', // uppercase
    'core.MyTool', // uppercase segment
    '-tool', // starts with hyphen
    'tool-', // ends with hyphen
    '_tool', // starts with underscore
    'tool_', // ends with underscore
    'tool..id', // consecutive dots
    'tool..', // ends with dot
    'tool.', // ends with dot
    '.tool', // starts with dot
    'tool#id', // illegal char
    'tool/id', // illegal char
  ];

  test.each(validToolIds)('valid: %s', (toolId) => {
    expect(toolIdRegexp.test(toolId)).toBe(true);
  });

  test.each(invalidToolIds)('invalid: %s', (toolId) => {
    expect(toolIdRegexp.test(toolId)).toBe(false);
  });
});
