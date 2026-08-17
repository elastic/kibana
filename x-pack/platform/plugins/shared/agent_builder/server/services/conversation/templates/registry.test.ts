/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_TEMPLATES } from '../../../../common/templates';
import { getTemplate } from './registry';

describe('CONVERSATION_TEMPLATES', () => {
  it('contains at least three templates (large, large, minimal)', () => {
    expect(CONVERSATION_TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it('includes the phishing, security-finding, and quick-note fixtures', () => {
    const ids = CONVERSATION_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('phishing');
    expect(ids).toContain('security-finding');
    expect(ids).toContain('quick-note');
  });

  it('quick-note is intentionally minimal (3 fields)', () => {
    const quickNote = CONVERSATION_TEMPLATES.find((t) => t.id === 'quick-note')!;
    expect(Object.keys(quickNote.fields)).toHaveLength(3);
  });
});

describe('getTemplate', () => {
  it('returns a template when the id matches', () => {
    const firstTemplate = CONVERSATION_TEMPLATES[0];
    const result = getTemplate(firstTemplate.id);
    expect(result).toBe(firstTemplate);
  });

  it('returns undefined for an unknown id', () => {
    expect(getTemplate('does-not-exist')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(getTemplate('')).toBeUndefined();
  });

  it('matches only by exact id (no partial match)', () => {
    const firstTemplate = CONVERSATION_TEMPLATES[0];
    expect(getTemplate(firstTemplate.id.slice(0, 3))).toBeUndefined();
  });
});
