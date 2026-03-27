/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { privilegeEscalationModule } from './privilege_escalation';

describe('privilegeEscalationModule', () => {
  it('has correct name and category', () => {
    expect(privilegeEscalationModule.name).toBe('privilege-escalation');
    expect(privilegeEscalationModule.category).toBe('privilege-escalation');
  });

  it('generates examples with all required fields', () => {
    const examples = privilegeEscalationModule.generate();

    expect(examples.length).toBeGreaterThan(0);

    for (const ex of examples) {
      expect(ex.input).toBeDefined();
      expect(typeof ex.input.prompt).toBe('string');
      expect(ex.input.prompt.length).toBeGreaterThan(0);
      expect(ex.input.category).toBe('privilege-escalation');
      expect(typeof ex.input.technique).toBe('string');
      expect(typeof ex.input.description).toBe('string');
    }
  });

  it('generates at least one example per technique group', () => {
    const examples = privilegeEscalationModule.generate();
    const techniques = new Set(examples.map((e) => e.input.technique));

    expect(techniques.has('tool-abuse')).toBe(true);
    expect(techniques.has('scope-escalation')).toBe(true);
    expect(techniques.has('role-impersonation')).toBe(true);
  });

  it('filters by technique when specified', () => {
    const examples = privilegeEscalationModule.generate({ techniques: ['tool-abuse'] });

    expect(examples.length).toBeGreaterThan(0);
    for (const ex of examples) {
      expect(ex.input.technique).toBe('tool-abuse');
    }
  });

  it('returns empty array for unknown technique', () => {
    const examples = privilegeEscalationModule.generate({ techniques: ['nonexistent'] });
    expect(examples).toEqual([]);
  });

  it('returns examples for multiple selected techniques', () => {
    const examples = privilegeEscalationModule.generate({
      techniques: ['tool-abuse', 'role-impersonation'],
    });
    const techniques = new Set(examples.map((e) => e.input.technique));
    expect(techniques.has('tool-abuse')).toBe(true);
    expect(techniques.has('role-impersonation')).toBe(true);
    expect(techniques.size).toBe(2);
  });
});
