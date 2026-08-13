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
  buildExtendedFieldsFromTemplate,
  parseTemplateDefinition,
  resolveV2Template,
  resolveV2TemplateForLegacyKey,
} from './v2_template_utils';
import type { CasesClient } from '../../client';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';

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

  it('returns null when schema validation fails (missing required fields block)', () => {
    // Case defaults (incl. name) are optional; the structural `fields` block is the one required key.
    const result = parseTemplateDefinition('name: "Only a title"');
    expect(result).toBeNull();
  });

  it('parses a YAML 1.1 legacy boolean-like scalar as a plain string, matching the UI parser', () => {
    // js-yaml (YAML 1.1) resolves `no` as a boolean; the `yaml` package (YAML 1.2, used by
    // the UI/routes) resolves it as the string "no". Both parsers must agree here, otherwise
    // the connector's `extended_fields` diverge from what the template form pre-fills.
    const yamlWithLegacyScalarDefault = `
name: "Legacy scalar"
fields:
  - name: field_a
    type: keyword
    control: INPUT_TEXT
    label: Field A
    metadata:
      default: no
`;
    const result = parseTemplateDefinition(yamlWithLegacyScalarDefault);
    expect(result).not.toBeNull();
    expect(result?.fields[0]).toMatchObject({ metadata: { default: 'no' } });
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

  it('returns parsed definition for a valid template', async () => {
    const client = makeClient({
      getTemplate: jest.fn().mockResolvedValue(makeTemplateSO('t1', childYaml)),
    });

    const result = await resolveV2Template(client, 't1', '1', 'securitySolution', mockLogger);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Child Template');
  });

  it('returns null and logs warn when template not found', async () => {
    const client = makeClient({
      getTemplate: jest.fn().mockResolvedValue(undefined),
    });

    const result = await resolveV2Template(
      client,
      'missing-id',
      '1',
      'securitySolution',
      mockLogger
    );
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not found or has been deleted'),
      expect.any(Object)
    );
  });

  it('returns null and logs warn when template owner does not match', async () => {
    const client = makeClient({
      getTemplate: jest
        .fn()
        .mockResolvedValue(makeTemplateSO('t1', childYaml, { owner: 'observability' })),
    });

    const result = await resolveV2Template(client, 't1', '1', 'securitySolution', mockLogger);
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('belongs to owner'),
      expect.any(Object)
    );
  });

  it('returns null and logs warn when definition YAML is invalid', async () => {
    const client = makeClient({
      getTemplate: jest.fn().mockResolvedValue(makeTemplateSO('t1', ': invalid yaml [')),
    });

    const result = await resolveV2Template(client, 't1', '1', 'securitySolution', mockLogger);
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('invalid definition'),
      expect.any(Object)
    );
  });
});

describe('resolveV2TemplateForLegacyKey', () => {
  const makeClientWithTemplates = (
    templates: Array<Partial<Template> & { definition: string }>
  ): CasesClient =>
    ({
      templates: {
        getAllTemplates: jest.fn().mockResolvedValue({
          templates: templates.map((t) => ({
            templateId: 'tmpl-id',
            name: 'Test template',
            owner: 'securitySolution',
            templateVersion: 1,
            fieldSearchMatches: false,
            ...t,
          })),
          page: 1,
          perPage: 10000,
          total: templates.length,
        }),
      },
    } as unknown as CasesClient);

  beforeEach(() => jest.clearAllMocks());

  it('resolves by legacyKey (exact v1 lineage) and returns id + version', async () => {
    const client = makeClientWithTemplates([
      {
        templateId: 'v2-id',
        name: 'TestTemplateOne',
        legacyKey: 'v1-key-1',
        templateVersion: 3,
        definition: childYaml,
      },
    ]);

    const result = await resolveV2TemplateForLegacyKey(
      client,
      'v1-key-1',
      'TestTemplateOne',
      'securitySolution',
      mockLogger
    );

    expect(result).not.toBeNull();
    expect(result?.templateId).toBe('v2-id');
    expect(result?.templateVersion).toBe(3);
    expect(result?.definition.name).toBe('Child Template');
  });

  it('prefers legacyKey over name to disambiguate v1 templates that shared a name', async () => {
    const client = makeClientWithTemplates([
      { templateId: 'v2-id-a', name: 'Shared Name', legacyKey: 'v1-key-a', definition: childYaml },
      { templateId: 'v2-id-b', name: 'Shared Name', legacyKey: 'v1-key-b', definition: childYaml },
    ]);

    const result = await resolveV2TemplateForLegacyKey(
      client,
      'v1-key-b',
      'Shared Name',
      'securitySolution',
      mockLogger
    );

    expect(result?.templateId).toBe('v2-id-b');
  });

  it('falls back to a normalized name match when no legacyKey is recorded', async () => {
    const client = makeClientWithTemplates([
      { templateId: 'v2-id', name: 'TestTemplateOne', templateVersion: 2, definition: childYaml },
    ]);

    const result = await resolveV2TemplateForLegacyKey(
      client,
      'v1-key-unknown',
      '  testtemplateone  ',
      'securitySolution',
      mockLogger
    );

    expect(result?.templateId).toBe('v2-id');
    expect(result?.templateVersion).toBe(2);
  });

  it('returns null and logs when neither the key nor the name matches', async () => {
    const client = makeClientWithTemplates([
      { templateId: 'v2-id', name: 'Some Other Template', definition: childYaml },
    ]);

    const result = await resolveV2TemplateForLegacyKey(
      client,
      'v1-key-1',
      'TestTemplateOne',
      'securitySolution',
      mockLogger
    );

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No migrated v2 template found'),
      expect.any(Object)
    );
  });

  it('returns null and logs when the matched template has an invalid definition', async () => {
    const client = makeClientWithTemplates([
      {
        templateId: 'v2-id',
        name: 'TestTemplateOne',
        legacyKey: 'v1-key-1',
        definition: ': invalid yaml [',
      },
    ]);

    const result = await resolveV2TemplateForLegacyKey(
      client,
      'v1-key-1',
      'TestTemplateOne',
      'securitySolution',
      mockLogger
    );

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('invalid definition'),
      expect.any(Object)
    );
  });

  it('does not match a template with the same legacyKey but a different owner', async () => {
    const client = makeClientWithTemplates([
      {
        templateId: 'v2-id',
        name: 'TestTemplateOne',
        legacyKey: 'v1-key-1',
        owner: 'observability',
        definition: childYaml,
      },
    ]);

    const result = await resolveV2TemplateForLegacyKey(
      client,
      'v1-key-1',
      'TestTemplateOne',
      'securitySolution',
      mockLogger
    );

    expect(result).toBeNull();
  });
});

describe('buildExtendedFieldsFromTemplate', () => {
  const makeClientWithDefs = (defs: FieldDefinition[]): CasesClient =>
    ({
      fieldDefinitions: {
        getFieldDefinitions: jest
          .fn()
          .mockResolvedValue({ fieldDefinitions: defs, total: defs.length }),
      },
    } as unknown as CasesClient);

  it('returns an empty map when the definition has no fields', async () => {
    const result = await buildExtendedFieldsFromTemplate(
      makeClientWithDefs([]),
      { name: 'T', fields: [] },
      'securitySolution'
    );
    expect(result).toEqual({});
  });

  it('coerces an inline numeric default to a string key', async () => {
    const result = await buildExtendedFieldsFromTemplate(
      makeClientWithDefs([]),
      {
        name: 'T',
        fields: [
          {
            name: 'count',
            type: 'long',
            control: 'INPUT_NUMBER',
            label: 'Count',
            metadata: { default: 42 },
          },
        ],
      },
      'securitySolution'
    );
    expect(result).toEqual({ count_as_long: '42' });
  });

  it('resolves a $ref field from the library and includes its default', async () => {
    const libraryDef: FieldDefinition = {
      fieldDefinitionId: 'fd-1',
      name: 'lib_field',
      owner: 'securitySolution',
      definition:
        'name: lib_field\ntype: keyword\ncontrol: INPUT_TEXT\nlabel: Lib field\nmetadata:\n  default: "from-library"',
    };

    const result = await buildExtendedFieldsFromTemplate(
      makeClientWithDefs([libraryDef]),
      { name: 'T', fields: [{ $ref: 'lib_field' }] },
      'securitySolution'
    );
    expect(result).toEqual({ lib_field_as_keyword: 'from-library' });
  });

  it('skips a $ref field that has no matching library definition', async () => {
    const result = await buildExtendedFieldsFromTemplate(
      makeClientWithDefs([]),
      { name: 'T', fields: [{ $ref: 'missing_field' }] },
      'securitySolution'
    );
    expect(result).toEqual({});
  });
});
