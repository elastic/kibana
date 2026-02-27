/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateAgentId, agentIdRegexp, agentIdMaxLength } from './agent_ids';
import { protectedNamespaces } from '../base/namespaces';

describe('validateAgentId', () => {
  test('returns undefined for valid id (non built-in)', () => {
    expect(validateAgentId({ agentId: 'myagent', builtIn: false })).toBeUndefined();
    expect(validateAgentId({ agentId: 'foo_bar-baz.qux_123', builtIn: false })).toBeUndefined();
  });

  test('returns undefined for valid id (built-in)', () => {
    expect(validateAgentId({ agentId: 'myagent', builtIn: true })).toBeUndefined();
    expect(validateAgentId({ agentId: 'core.agent', builtIn: true })).toBeUndefined();
  });

  test('fails on invalid format (regexp)', () => {
    const invalids = [
      '',
      '.myagent',
      'myagent.',
      'core..myagent',
      'MyAgent',
      'core.MyAgent',
      '-agent',
      'agent-',
      '_agent',
      'agent_',
      'agent..id',
      'agent..',
      'agent.',
      '.agent',
      'agent#id',
      'agent/id',
    ];

    for (const agentId of invalids) {
      const error = validateAgentId({ agentId, builtIn: false });
      expect(error).toBe(
        'Agent ids must start and end with a letter or number, and can only contain lowercase letters, numbers, dots, hyphens and underscores'
      );
    }
  });

  test('fails on agentId exceeding max length', () => {
    const overMax = 'a'.repeat(agentIdMaxLength + 1);
    const error = validateAgentId({ agentId: overMax, builtIn: false });
    expect(error).toBe(`Agent ids are limited to ${agentIdMaxLength} characters.`);
  });

  test('fails when agentId equals a protected namespace name', () => {
    const protectedNamespaceName = protectedNamespaces[0];
    const error = validateAgentId({ agentId: protectedNamespaceName, builtIn: false });
    expect(error).toBe('Agent id cannot have the same name as a reserved namespace.');
  });

  test('fails when non built-in agent uses a protected namespace', () => {
    const protectedNamespaceName = protectedNamespaces[0];
    const agentId = `${protectedNamespaceName}.agent`;
    const error = validateAgentId({ agentId, builtIn: false });
    expect(error).toBe('Agent id is using a protected namespace.');
  });

  test('allows built-in agent to use a protected namespace', () => {
    const protectedNamespaceName = protectedNamespaces[0];
    const agentId = `${protectedNamespaceName}.internal_agent`;
    const error = validateAgentId({ agentId, builtIn: true });
    expect(error).toBeUndefined();
  });
});

describe('agentId regexp', () => {
  const validAgentIds = [
    'myagent',
    'core.myagent',
    'core.foo.myagent',
    'a',
    'a.b',
    'agent_1',
    'agent-1',
    'foo_bar-baz.qux_123',
    'a1.b2.c3',
    'abc.def_ghi-jkl.mno',
  ];

  const invalidAgentIds = [
    '', // empty string
    '.myagent', // starts with dot
    'myagent.', // ends with dot
    'core..myagent', // double dot
    'MyAgent', // uppercase
    'core.MyAgent', // uppercase segment
    '-agent', // starts with hyphen
    'agent-', // ends with hyphen
    '_agent', // starts with underscore
    'agent_', // ends with underscore
    'agent..id', // consecutive dots
    'agent..', // ends with dot
    'agent.', // ends with dot
    '.agent', // starts with dot
    'agent#id', // illegal char
    'agent/id', // illegal char
  ];

  test.each(validAgentIds)('valid: %s', (agentId) => {
    expect(agentIdRegexp.test(agentId)).toBe(true);
  });

  test.each(invalidAgentIds)('invalid: %s', (agentId) => {
    expect(agentIdRegexp.test(agentId)).toBe(false);
  });
});
