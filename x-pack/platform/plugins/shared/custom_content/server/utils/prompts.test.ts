/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSystemPromptStatic, buildSystemPromptTemplate, formatSampleTable } from './prompts';

describe('formatSampleTable', () => {
  const columns = [
    { name: 'host', type: 'keyword' },
    { name: 'count', type: 'long' },
  ];

  it('produces a markdown pipe table with header, separator, and data rows', () => {
    const result = formatSampleTable(columns, [['web-1', 42]]);
    expect(result).toBe('host | count\n--- | ---\nweb-1 | 42');
  });

  it('produces only header and separator when rows are empty', () => {
    const result = formatSampleTable(columns, []);
    expect(result).toBe('host | count\n--- | ---\n');
  });

  it('sanitizes HTML angle brackets in cell values', () => {
    const result = formatSampleTable(columns, [['<script>', 0]]);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('breaks Liquid delimiters in cell values', () => {
    const result = formatSampleTable(columns, [['{{ drop }}', 0]]);
    expect(result).not.toContain('{{');
  });
});

describe('buildSystemPromptStatic', () => {
  it('includes the core output rules', () => {
    const prompt = buildSystemPromptStatic('LIGHT');
    expect(prompt).toContain('OUTPUT RULES');
    expect(prompt).toContain('sandboxed iframe');
    expect(prompt).toContain('CONTENT RULES');
  });

  it('includes LIGHT MODE color section for LIGHT colorMode', () => {
    const prompt = buildSystemPromptStatic('LIGHT');
    expect(prompt).toContain('LIGHT MODE');
    expect(prompt).toContain('transparent');
    expect(prompt).not.toContain('DARK MODE');
  });

  it('includes DARK MODE color section for DARK colorMode', () => {
    const prompt = buildSystemPromptStatic('DARK');
    expect(prompt).toContain('DARK MODE');
    expect(prompt).not.toContain('LIGHT MODE');
  });
});

describe('buildSystemPromptTemplate', () => {
  it('includes the Liquid data model and syntax section', () => {
    const prompt = buildSystemPromptTemplate('LIGHT');
    expect(prompt).toContain('DATA MODEL');
    expect(prompt).toContain('LIQUID SYNTAX');
    expect(prompt).toContain('{% for row in rows %}');
    expect(prompt).toContain('.value');
    expect(prompt).toContain('.pct');
  });

  it('includes LIGHT MODE color section for LIGHT colorMode', () => {
    const prompt = buildSystemPromptTemplate('LIGHT');
    expect(prompt).toContain('LIGHT MODE');
    expect(prompt).not.toContain('DARK MODE');
  });

  it('includes DARK MODE color section for DARK colorMode', () => {
    const prompt = buildSystemPromptTemplate('DARK');
    expect(prompt).toContain('DARK MODE');
    expect(prompt).not.toContain('LIGHT MODE');
  });

  it('dark mode body reset includes a background color', () => {
    const prompt = buildSystemPromptTemplate('DARK');
    expect(prompt).toMatch(/body \{[^}]*background:/);
  });

  it('light mode body reset does not set a background color', () => {
    const prompt = buildSystemPromptTemplate('LIGHT');
    expect(prompt).toContain('transparent');
    expect(prompt).not.toMatch(/body \{[^}]*background:/);
  });
});
