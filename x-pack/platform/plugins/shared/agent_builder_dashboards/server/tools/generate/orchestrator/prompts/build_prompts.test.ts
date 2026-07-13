/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSystemPrompt, createUserPrompt } from './build_prompts';

describe('createSystemPrompt', () => {
  const prompt = createSystemPrompt({});

  it('absorbs the design knowledge that used to live in the outer skill', () => {
    expect(prompt).toContain('Dashboard Composition Guidelines');
    expect(prompt).toContain('Grid Packing Rules');
    expect(prompt).toContain('Available chart types:');
  });

  it('teaches tool usage, controls, and the ES|QL pinning contract', () => {
    expect(prompt).toContain('set_metadata');
    expect(prompt).toContain('options_list_control');
    expect(prompt).toContain('change_data');
    expect(prompt).toContain('Never write or invent ES|QL yourself');
  });

  it('teaches one-shot data discovery via explore_data', () => {
    expect(prompt).toContain('explore_data ONCE');
    expect(prompt).toContain('Skip explore_data when the index and fields were already provided');
    expect(prompt).toContain('perform it before planning');
    expect(prompt).toContain('BEFORE calling any mutating tools');
  });

  it('does not describe a deterministic validation or automatic critique phase', () => {
    expect(prompt).not.toContain('validation pass');
    expect(prompt).not.toContain('validation errors');
    expect(prompt).not.toContain('fresh-eyes');
  });

  it('teaches terminal panel failure recovery', () => {
    expect(prompt).toContain('internal retries are already exhausted');
    expect(prompt).toContain('failureKind is "visualization_generation"');
    expect(prompt).toContain('failureId');
    expect(prompt).toContain('resolvesFailureId');
  });

  it('teaches explicit existing-dashboard critique and material decision reporting', () => {
    expect(prompt).toContain('call critique_dashboard before any mutating tool');
    expect(prompt).toContain('Do not call it for');
    expect(prompt).toContain('a new dashboard or a routine targeted edit');
    expect(prompt).toContain('clear semantic defect');
    expect(prompt).toContain('Material decisions');
    expect(prompt).toContain('panel addition, removal, replacement, existing-query change');
  });

  it('appends additional instructions at the end', () => {
    const withExtras = createSystemPrompt({ additionalInstructions: 'Prefer dark palettes.' });
    expect(withExtras.endsWith('Prefer dark palettes.')).toBe(true);
  });
});

describe('createUserPrompt', () => {
  it('contains the request and optional context', () => {
    const prompt = createUserPrompt({
      request: 'a cpu dashboard',
      additionalContext: 'index: metrics-*',
    });
    expect(prompt).toContain('a cpu dashboard');
    expect(prompt).toContain('index: metrics-*');
  });

  it('embeds the existing dashboard summary when editing', () => {
    const prompt = createUserPrompt({
      request: 'remove the cpu panel',
      existingDashboard: {
        title: 'Existing',
        description: undefined,
        panels: [{ type: 'lens', id: 'panel-cpu', config: {}, grid: { x: 0, y: 0, w: 24, h: 9 } }],
      },
    });
    expect(prompt).toContain('<dashboard-to-edit>');
    expect(prompt).toContain('panel-cpu');
  });
});
