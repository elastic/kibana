/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SavedObject, Logger } from '@kbn/core/server';
import type { Template } from '../../../common/types/domain/template/v1';
import {
  mergeV2TemplateDefinitions,
  parseTemplateDefinition,
  resolveV2Template,
} from './v2_template_utils';
import type { ParsedTemplateDefinition } from './v2_template_utils';
import type { CasesClient } from '../../client';

const mockLogger = loggingSystemMock.createLogger() as unknown as Logger;

const makeTemplateSO = (
  id: string,
  definition: string,
  overrides: Partial<Template> = {}
): SavedObject<Template> => ({
  id,
  type: 'cases-templates',
  references: [],
  attributes: {
    templateId: id,
    name: 'Test template',
    owner: 'securitySolution',
    definition,
    templateVersion: 1,
    deletedAt: null,
    ...overrides,
  },
});

const childYaml = `
name: "Child Template"
description: "Child description"
tags:
  - tag-child
severity: high
category: "Malware"
fields: []
`;

const parentYaml = `
name: "Parent Template"
description: "Parent description"
tags:
  - tag-parent
severity: low
fields: []
`;

describe('parseTemplateDefinition', () => {
  it('parses valid YAML', () => {
    const result = parseTemplateDefinition(childYaml);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Child Template');
    expect(result?.description).toBe('Child description');
    expect(result?.tags).toEqual(['tag-child']);
    expect(result?.severity).toBe('high');
    expect(result?.category).toBe('Malware');
  });

  it('returns null for invalid YAML', () => {
    const result = parseTemplateDefinition(': bad yaml: [');
    expect(result).toBeNull();
  });

  it('returns null when schema validation fails (missing required name)', () => {
    const result = parseTemplateDefinition('description: "no name"\nfields: []');
    expect(result).toBeNull();
  });
});

describe('mergeV2TemplateDefinitions', () => {
  const parent: ParsedTemplateDefinition = {
    name: 'Parent',
    description: 'Parent desc',
    tags: ['parent-tag'],
    severity: 'low',
    category: 'ParentCat',
    fields: [],
  };

  it('child name wins', () => {
    const child: ParsedTemplateDefinition = { name: 'Child', fields: [] };
    const merged = mergeV2TemplateDefinitions(parent, child);
    expect(merged.name).toBe('Child');
  });

  it('child description wins when set', () => {
    const child: ParsedTemplateDefinition = {
      name: 'Child',
      description: 'Child desc',
      fields: [],
    };
    const merged = mergeV2TemplateDefinitions(parent, child);
    expect(merged.description).toBe('Child desc');
  });

  it('parent description used when child has none', () => {
    const child: ParsedTemplateDefinition = { name: 'Child', fields: [] };
    const merged = mergeV2TemplateDefinitions(parent, child);
    expect(merged.description).toBe('Parent desc');
  });

  it('child tags win when set', () => {
    const child: ParsedTemplateDefinition = {
      name: 'Child',
      tags: ['child-tag'],
      fields: [],
    };
    const merged = mergeV2TemplateDefinitions(parent, child);
    expect(merged.tags).toEqual(['child-tag']);
  });

  it('parent tags used when child has none', () => {
    const child: ParsedTemplateDefinition = { name: 'Child', fields: [] };
    const merged = mergeV2TemplateDefinitions(parent, child);
    expect(merged.tags).toEqual(['parent-tag']);
  });

  it('child severity wins when set', () => {
    const child: ParsedTemplateDefinition = {
      name: 'Child',
      severity: 'critical',
      fields: [],
    };
    const merged = mergeV2TemplateDefinitions(parent, child);
    expect(merged.severity).toBe('critical');
  });

  it('parent severity used when child has none', () => {
    const child: ParsedTemplateDefinition = { name: 'Child', fields: [] };
    const merged = mergeV2TemplateDefinitions(parent, child);
    expect(merged.severity).toBe('low');
  });

  it('child category wins when set', () => {
    const child: ParsedTemplateDefinition = {
      name: 'Child',
      category: 'ChildCat',
      fields: [],
    };
    const merged = mergeV2TemplateDefinitions(parent, child);
    expect(merged.category).toBe('ChildCat');
  });

  it('parent category used when child has none', () => {
    const child: ParsedTemplateDefinition = { name: 'Child', fields: [] };
    const merged = mergeV2TemplateDefinitions(parent, child);
    expect(merged.category).toBe('ParentCat');
  });
});

describe('resolveV2Template', () => {
  const makeClient = (impl: Partial<CasesClient['templates']>): CasesClient =>
    ({
      templates: {
        getAllTemplates: jest.fn(),
        getTemplate: jest.fn(),
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        getTags: jest.fn(),
        getAuthors: jest.fn(),
        ...impl,
      },
    } as unknown as CasesClient);

  beforeEach(() => jest.clearAllMocks());

  it('returns parsed definition for a simple template (no extends)', async () => {
    const client = makeClient({
      getTemplate: jest.fn().mockResolvedValue(makeTemplateSO('t1', childYaml)),
    });

    const result = await resolveV2Template(client, 't1', '1', mockLogger);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Child Template');
  });

  it('returns null and logs warn when template not found', async () => {
    const client = makeClient({
      getTemplate: jest.fn().mockResolvedValue(undefined),
    });

    const result = await resolveV2Template(client, 'missing-id', '1', mockLogger);
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not found or has been deleted'),
      expect.any(Object)
    );
  });

  it('returns null and logs warn when definition YAML is invalid', async () => {
    const client = makeClient({
      getTemplate: jest.fn().mockResolvedValue(makeTemplateSO('t1', ': invalid yaml [')),
    });

    const result = await resolveV2Template(client, 't1', '1', mockLogger);
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('invalid definition'),
      expect.any(Object)
    );
  });

  it('resolves extends and merges parent + child', async () => {
    const childWithExtendsYaml = `
name: "Child Template"
description: "Child desc"
extends: "parent-id"
fields: []
`;
    const client = makeClient({
      getTemplate: jest
        .fn()
        .mockResolvedValueOnce(makeTemplateSO('child-id', childWithExtendsYaml))
        .mockResolvedValueOnce(makeTemplateSO('parent-id', parentYaml)),
    });

    const result = await resolveV2Template(client, 'child-id', '1', mockLogger);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Child Template');
    expect(result?.description).toBe('Child desc');
    expect(result?.severity).toBe('low'); // inherited from parent
  });

  it('uses child-only definition when parent not found, logs warn', async () => {
    const childWithExtendsYaml = `
name: "Child"
extends: "parent-id"
fields: []
`;
    const client = makeClient({
      getTemplate: jest
        .fn()
        .mockResolvedValueOnce(makeTemplateSO('child-id', childWithExtendsYaml))
        .mockResolvedValueOnce(undefined),
    });

    const result = await resolveV2Template(client, 'child-id', '1', mockLogger);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Child');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Parent template'),
      expect.any(Object)
    );
  });

  it('uses child-only definition when parent YAML is invalid, logs warn', async () => {
    const childWithExtendsYaml = `
name: "Child"
extends: "parent-id"
fields: []
`;
    const client = makeClient({
      getTemplate: jest
        .fn()
        .mockResolvedValueOnce(makeTemplateSO('child-id', childWithExtendsYaml))
        .mockResolvedValueOnce(makeTemplateSO('parent-id', ': bad yaml [')),
    });

    const result = await resolveV2Template(client, 'child-id', '1', mockLogger);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Child');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('invalid definition'),
      expect.any(Object)
    );
  });
});
