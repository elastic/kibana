/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDreamingTemplateConfig, matchingTemplateId } from './dreaming_templates';

describe('buildDreamingTemplateConfig', () => {
  const template = {
    summary: 'Customer support knowledge base.',
    rationale: 'Issues first.',
    dreaming: { instructions: 'Record confirmed fixes.', facts: [{ type: 'solution' }] },
  };

  it('opens the instructions with the summary', () => {
    expect(buildDreamingTemplateConfig(template, 'Acme support for billing. ')).toEqual({
      instructions: 'Acme support for billing.\n\nRecord confirmed fixes.',
      facts: [{ type: 'solution' }],
    });
  });

  it('keeps the template instructions when the summary is cleared', () => {
    expect(buildDreamingTemplateConfig(template, ' ').instructions).toBe('Record confirmed fixes.');
  });
});

describe('matchingTemplateId', () => {
  const templates = [
    { id: 'support', dreaming: { facts: [{ type: 'solution' }, { type: 'policy' }] } },
    { id: 'legal', dreaming: { facts: [{ type: 'obligation' }, { type: 'policy' }] } },
  ];

  it('picks the template sharing the most fact types', () => {
    expect(
      matchingTemplateId({ facts: [{ type: 'solution' }, { type: 'policy' }] }, templates)
    ).toBe('support');
    expect(matchingTemplateId({ facts: [{ type: 'obligation' }] }, templates)).toBe('legal');
  });

  it('picks none when no fact type matches', () => {
    expect(matchingTemplateId({ facts: [{ type: 'other' }] }, templates)).toBeUndefined();
    expect(matchingTemplateId({}, templates)).toBeUndefined();
  });
});
