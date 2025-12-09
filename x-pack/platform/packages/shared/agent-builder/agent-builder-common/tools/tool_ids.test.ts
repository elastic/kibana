/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toolIdRegexp, validateToolId, toolIdMaxLength } from './tool_ids';
import { protectedNamespaces } from '../base/namespaces';

describe('validateToolId', () => {
  test('returns undefined for valid id (non built-in)', () => {
    expect(validateToolId({ toolId: 'mytool', builtIn: false })).toBeUndefined();

    expect(validateToolId({ toolId: 'foo_bar-baz.qux_123', builtIn: false })).toBeUndefined();
  });

  test('fails on invalid format (regexp)', () => {
    const invalids = [
      '',
      '.mytool',
      'mytool.',
      'core..mytool',
      'MyTool',
      'core.MyTool',
      '-tool',
      'tool-',
      '_tool',
      'tool_',
      'tool..id',
      'tool..',
      'tool.',
      '.tool',
      'tool#id',
      'tool/id',
    ];

    for (const toolId of invalids) {
      const error = validateToolId({ toolId, builtIn: false });
      expect(error).toBe(
        'Tool ids must start and end with a letter or number, and can only contain lowercase letters, numbers, dots, hyphens and underscores'
      );
    }
  });

  test('fails on toolId exceeding max length', () => {
    const overMax = 'a'.repeat(toolIdMaxLength + 1);
    const error = validateToolId({ toolId: overMax, builtIn: false });
    expect(error).toBe(`Tool ids are limited to ${toolIdMaxLength} characters.`);
  });

  test('fails when toolId equals a protected namespace name', () => {
    const protectedNamespaceName = protectedNamespaces[0];
    const error = validateToolId({ toolId: protectedNamespaceName, builtIn: false });
    expect(error).toBe('Tool id cannot have the same name as a reserved namespace.');
  });

  test('fails when non built-in tool uses a protected namespace', () => {
    const protectedNamespaceName = protectedNamespaces[0];
    const toolId = `${protectedNamespaceName}.mytool`;
    const error = validateToolId({ toolId, builtIn: false });
    expect(error).toBe('Tool id is using a protected namespace.');
  });

  test('allows built-in tool to use a protected namespace', () => {
    const protectedNamespaceName = protectedNamespaces[0];
    const toolId = `${protectedNamespaceName}.internal_tool`;
    const error = validateToolId({ toolId, builtIn: true });
    expect(error).toBeUndefined();
  });
});

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
