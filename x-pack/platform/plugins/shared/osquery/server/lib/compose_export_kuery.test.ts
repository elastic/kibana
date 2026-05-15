/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeExportKuery } from './compose_export_kuery';

describe('composeExportKuery', () => {
  it('wraps baseFilter only in parens', () => {
    const result = composeExportKuery({ baseFilter: 'action_id: "abc"' });
    expect(result).toBe('(action_id: "abc")');
  });

  it('appends a single agent id as an agent.id clause', () => {
    const result = composeExportKuery({
      baseFilter: 'action_id: "abc"',
      agentIds: ['agent-1'],
    });
    expect(result).toBe('((action_id: "abc") AND (agent.id: "agent-1"))');
  });

  it('joins multiple agent ids with OR', () => {
    const result = composeExportKuery({
      baseFilter: 'action_id: "abc"',
      agentIds: ['agent-1', 'agent-2'],
    });
    expect(result).toBe('((action_id: "abc") AND (agent.id: "agent-1" OR agent.id: "agent-2"))');
  });

  it('appends kuery as a separate AND clause', () => {
    const result = composeExportKuery({
      baseFilter: 'action_id: "abc"',
      kuery: 'host.name: "foo"',
    });
    expect(result).toBe('((action_id: "abc") AND (host.name: "foo"))');
  });

  it('combines baseFilter, agentIds, and kuery', () => {
    const result = composeExportKuery({
      baseFilter: 'action_id: "abc"',
      agentIds: ['agent-1'],
      kuery: 'host.name: "foo"',
    });
    expect(result).toBe('((action_id: "abc") AND (agent.id: "agent-1") AND (host.name: "foo"))');
  });

  it('escapes special KQL characters in agent ids', () => {
    const result = composeExportKuery({
      baseFilter: 'action_id: "abc"',
      agentIds: ['host:with"special\\chars'],
    });
    expect(result).toContain('agent.id:');
    expect(result).not.toContain('"host:with"special\\chars"');
  });

  it('outer parens prevent an OR in kuery from escaping the baseFilter gate', () => {
    const result = composeExportKuery({
      baseFilter: 'action_id: "abc"',
      kuery: 'host.name: "a" OR action_id: "other"',
    });
    expect(result).toBe('((action_id: "abc") AND (host.name: "a" OR action_id: "other"))');
    expect(result).toMatch(/^\(/);
    expect(result).toMatch(/\)$/);
    const innerKuery = result.indexOf('(host.name');
    expect(innerKuery).toBeGreaterThan(-1);
  });

  it('ignores empty agentIds array', () => {
    const result = composeExportKuery({
      baseFilter: 'action_id: "abc"',
      agentIds: [],
    });
    expect(result).toBe('(action_id: "abc")');
  });
});
