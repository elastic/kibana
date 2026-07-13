/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useParseYaml } from './use_parse_yaml';
import { checkTemplateExists } from '../utils';
import type { ValidatedFile } from './use_validate_yaml';
import { MAX_TEMPLATES_PER_FILE, MAX_TOTAL_IMPORT_TEMPLATES } from '../constants';

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  checkTemplateExists: jest.fn(),
}));

const makeValidatedFile = (name: string, documents: unknown[]): ValidatedFile => ({
  file: new File([''], name, { type: 'application/x-yaml' }),
  documents,
});

describe('useParseYaml', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty results for no files', async () => {
    const { result } = renderHook(() => useParseYaml());

    const output = await result.current.parseFiles([]);

    expect(output.templates).toHaveLength(0);
    expect(output.errors).toHaveLength(0);
  });

  it('parses a valid template document', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('test.yaml', [
      {
        template_name: 'My Template',
        template_description: 'A description',
        template_tags: ['tag1'],
      },
    ]);

    const output = await result.current.parseFiles([file]);

    expect(output.templates).toHaveLength(1);
    expect(output.templates[0]).toMatchObject({
      name: 'My Template',
      description: 'A description',
      tags: ['tag1'],
      sourceFileName: 'test.yaml',
      documentIndex: 0,
      existsOnServer: false,
    });
    expect(output.errors).toHaveLength(0);
  });

  it('parses top-level defaults when assignees are omitted', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('case-defaults.yaml', [
      {
        template_name: 'Template metadata name',
        template_description: 'Template metadata description',
        template_tags: ['template-tag'],
        name: 'Case Defaults Template',
        description: 'Default case description',
        tags: ['default-tag'],
        severity: 'medium',
        category: 'investigation',
        assignees: [{ uid: 'analyst-1' }],
      },
    ]);

    const output = await result.current.parseFiles([file]);

    expect(output.templates).toHaveLength(1);
    expect(output.templates[0].caseDefaults).toEqual({
      title: 'Case Defaults Template',
      description: 'Default case description',
      tags: ['default-tag'],
      severity: 'medium',
      category: 'investigation',
      assignees: [{ uid: 'analyst-1' }],
    });
    // Backward-compat fields remain populated for list/filter consumers.
    expect(output.templates[0].severity).toBe('medium');
    expect(output.templates[0].category).toBe('investigation');
    expect(output.templates[0].name).toBe('Template metadata name');
    expect(output.templates[0].description).toBe('Template metadata description');
    expect(output.templates[0].tags).toEqual(['template-tag']);
  });

  it('falls back to legacy non-prefixed metadata keys and does not use legacy name as case title', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('top-level-defaults.yaml', [
      {
        name: 'Top-level template metadata name',
        description: 'Top-level case description',
        tags: ['triage'],
        severity: 'high',
        category: 'security',
      },
    ]);

    const output = await result.current.parseFiles([file]);

    expect(output.templates).toHaveLength(1);
    // Legacy file (no template_* keys): `name` is the template identity, so it becomes the template
    // name — not the case-default title, which stays undefined to avoid a semantic regression.
    expect(output.templates[0].name).toBe('Top-level template metadata name');
    expect(output.templates[0].caseDefaults).toEqual({
      title: undefined,
      description: 'Top-level case description',
      tags: ['triage'],
      severity: 'high',
      category: 'security',
      assignees: undefined,
    });
  });

  it('handles multiple documents in one file', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('multi.yaml', [
      { name: 'Template A' },
      { name: 'Template B', severity: 'high' },
    ]);

    const output = await result.current.parseFiles([file]);

    expect(output.templates).toHaveLength(2);
    expect(output.templates[0].name).toBe('Template A');
    expect(output.templates[0].documentIndex).toBe(0);
    expect(output.templates[1].name).toBe('Template B');
    expect(output.templates[1].documentIndex).toBe(1);
    expect(output.templates[1].severity).toBe('high');
  });

  it('parses and carries a connector and settings block', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('connector.yaml', [
      {
        name: 'Connector Template',
        connector: {
          type: '.jira',
          id: 'jira-1',
          fields: { issueType: '10001', priority: 'High', parent: null },
        },
        settings: { syncAlerts: false, extractObservables: true },
      },
    ]);

    const output = await result.current.parseFiles([file]);

    expect(output.errors).toHaveLength(0);
    expect(output.templates).toHaveLength(1);
    expect(output.templates[0].connector).toEqual({
      type: '.jira',
      id: 'jira-1',
      fields: { issueType: '10001', priority: 'High', parent: null },
    });
    expect(output.templates[0].settings).toEqual({ syncAlerts: false, extractObservables: true });
  });

  it('rejects a connector whose field value is the wrong type', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('bad-connector.yaml', [
      {
        name: 'Bad Connector Template',
        // issueType must be string | null
        connector: {
          type: '.jira',
          id: 'jira-1',
          fields: { issueType: 5, priority: 'High', parent: null },
        },
      },
    ]);

    const output = await result.current.parseFiles([file]);

    expect(output.templates).toHaveLength(0);
    expect(output.errors).toHaveLength(1);
  });

  it('reports errors for invalid documents', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('bad.yaml', [{ description: 'missing name field' }]);

    const output = await result.current.parseFiles([file]);

    expect(output.templates).toHaveLength(0);
    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].fileName).toBe('bad.yaml');
    expect(output.errors[0].documentIndex).toBe(0);
  });

  it('separates valid and invalid documents', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('mixed.yaml', [
      { name: 'Valid Template' },
      { description: 'no name' },
    ]);

    const output = await result.current.parseFiles([file]);

    expect(output.templates).toHaveLength(1);
    expect(output.templates[0].name).toBe('Valid Template');
    expect(output.errors).toHaveLength(1);
  });

  it('converts null tags to undefined', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('test.yaml', [{ name: 'Test', tags: null }]);

    const output = await result.current.parseFiles([file]);

    expect(output.templates[0].tags).toBeUndefined();
  });

  it('errors when a file exceeds MAX_TEMPLATES_PER_FILE', async () => {
    const { result } = renderHook(() => useParseYaml());
    const documents = Array.from({ length: MAX_TEMPLATES_PER_FILE + 5 }, (_, i) => ({
      name: `Template ${i}`,
    }));
    const file = makeValidatedFile('huge.yaml', documents);

    const output = await result.current.parseFiles([file]);

    expect(output.templates).toHaveLength(MAX_TEMPLATES_PER_FILE);
    expect(output.errors.some((e) => e.fileName === 'huge.yaml' && e.documentIndex === -1)).toBe(
      true
    );
  });

  it('truncates templates exceeding MAX_TOTAL_IMPORT_TEMPLATES across files', async () => {
    const { result } = renderHook(() => useParseYaml());
    const half = Math.ceil(MAX_TOTAL_IMPORT_TEMPLATES / 2) + 1;
    const docsA = Array.from({ length: half }, (_, i) => ({ name: `A-${i}` }));
    const docsB = Array.from({ length: half }, (_, i) => ({ name: `B-${i}` }));
    const files = [makeValidatedFile('a.yaml', docsA), makeValidatedFile('b.yaml', docsB)];

    const output = await result.current.parseFiles(files);

    expect(output.templates).toHaveLength(MAX_TOTAL_IMPORT_TEMPLATES);
    expect(output.errors.some((e) => e.documentIndex === -1 && e.fileName === '')).toBe(true);
  });

  it('checks existence for templates with templateId', async () => {
    (checkTemplateExists as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('test.yaml', [
      { templateId: 'existing-1', name: 'Existing Template' },
    ]);

    const output = await result.current.parseFiles([file]);

    expect(checkTemplateExists).toHaveBeenCalledWith('existing-1');
    expect(output.templates[0].existsOnServer).toBe(true);
  });

  it('sets existsOnServer to false when check rejects', async () => {
    (checkTemplateExists as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('test.yaml', [{ templateId: 'broken-1', name: 'Test' }]);

    const output = await result.current.parseFiles([file]);

    expect(output.templates[0].existsOnServer).toBe(false);
  });

  it('does not call checkTemplateExists for templates without templateId', async () => {
    const { result } = renderHook(() => useParseYaml());
    const file = makeValidatedFile('test.yaml', [{ name: 'No ID' }]);

    await result.current.parseFiles([file]);

    expect(checkTemplateExists).not.toHaveBeenCalled();
  });
});
