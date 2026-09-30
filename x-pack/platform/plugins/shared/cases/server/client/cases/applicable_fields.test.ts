/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { getFieldSnakeKey } from '../../../common/utils';
import type { TemplatesService } from '../../services/templates';
import type { FieldDefinitionsService } from '../../services/field_definitions';
import { resolveApplicableFields, toApplicableField } from './applicable_fields';

describe('applicable_fields', () => {
  describe('toApplicableField', () => {
    it('maps a text global field to its storage key and defaults', () => {
      const field = {
        control: 'INPUT_TEXT',
        name: 'summary',
        type: 'keyword',
        label: 'Summary',
      } as unknown as InlineField;

      expect(toApplicableField(field, 'global')).toEqual({
        key: 'summary_as_keyword',
        name: 'summary',
        label: 'Summary',
        type: 'keyword',
        control: 'INPUT_TEXT',
        required: false,
        requiredOnClose: false,
        displayOnly: false,
        source: 'global',
        isGlobal: true,
      });
    });

    it('falls back to name when no label is authored', () => {
      const field = {
        control: 'INPUT_TEXT',
        name: 'summary',
        type: 'keyword',
      } as unknown as InlineField;

      expect(toApplicableField(field, 'global').label).toBe('summary');
    });

    it('carries options and default for a select field', () => {
      const field = {
        control: 'SELECT_BASIC',
        name: 'priority',
        type: 'keyword',
        label: 'Priority',
        metadata: { options: ['low', 'high'], default: 'low' },
      } as unknown as InlineField;

      const result = toApplicableField(field, 'template');
      expect(result.options).toEqual(['low', 'high']);
      expect(result.defaultValue).toBe('low');
      expect(result.source).toBe('template');
      expect(result.isGlobal).toBe(false);
    });

    it('coerces a numeric default to a string and uses the numeric storage type', () => {
      const field = {
        control: 'INPUT_NUMBER',
        name: 'score',
        type: 'integer',
        metadata: { default: 5 },
      } as unknown as InlineField;

      const result = toApplicableField(field, 'global');
      expect(result.key).toBe('score_as_integer');
      expect(result.defaultValue).toBe('5');
    });

    it('reflects required and required_on_close from validation', () => {
      const field = {
        control: 'INPUT_TEXT',
        name: 'notes',
        type: 'keyword',
        validation: { required: true, required_on_close: true },
      } as unknown as InlineField;

      const result = toApplicableField(field, 'global');
      expect(result.required).toBe(true);
      expect(result.requiredOnClose).toBe(true);
    });

    it('flags a MARKDOWN field as display-only', () => {
      const field = {
        control: 'MARKDOWN',
        name: 'instructions',
        type: 'keyword',
        metadata: { content: '# Hello' },
      } as unknown as InlineField;

      expect(toApplicableField(field, 'template').displayOnly).toBe(true);
    });
  });

  describe('resolveApplicableFields', () => {
    const makeFieldDef = (name: string, def: Record<string, unknown>) => ({
      fieldDefinitionId: name,
      name,
      owner: 'securitySolution',
      definition: yamlStringify({ name, ...def }),
      isGlobal: true,
    });

    const makeTemplateSO = (fields: Array<Record<string, unknown>>) => ({
      attributes: {
        templateId: 'tpl-1',
        name: 'Test Template',
        owner: 'securitySolution',
        definition: yamlStringify({ name: 'Test Template', fields }),
        templateVersion: 1,
        deletedAt: null,
        isLatest: true,
      },
    });

    let templatesService: jest.Mocked<Pick<TemplatesService, 'getTemplate'>>;
    let fieldDefinitionsService: jest.Mocked<Pick<FieldDefinitionsService, 'getFieldDefinitions'>>;

    beforeEach(() => {
      templatesService = { getTemplate: jest.fn() };
      fieldDefinitionsService = {
        getFieldDefinitions: jest.fn().mockResolvedValue({ fieldDefinitions: [], total: 0 }),
      };
    });

    it('returns only global fields when no template is provided', async () => {
      fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          makeFieldDef('priority', { label: 'Priority', type: 'keyword', control: 'INPUT_TEXT' }),
        ],
        total: 1,
      });

      const result = await resolveApplicableFields({
        owner: 'securitySolution',
        templatesService: templatesService as unknown as TemplatesService,
        fieldDefinitionsService: fieldDefinitionsService as unknown as FieldDefinitionsService,
      });

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('global');
      expect(result[0].field.name).toBe('priority');
    });

    it('fetches field definitions only once, reusing the result for globals and template $ref resolution', async () => {
      fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          makeFieldDef('priority', { label: 'Priority', type: 'keyword', control: 'INPUT_TEXT' }),
        ],
        total: 1,
      });
      templatesService.getTemplate.mockResolvedValue(makeTemplateSO([]) as never);

      await resolveApplicableFields({
        owner: 'securitySolution',
        templateId: 'tpl-1',
        templatesService: templatesService as unknown as TemplatesService,
        fieldDefinitionsService: fieldDefinitionsService as unknown as FieldDefinitionsService,
      });

      expect(fieldDefinitionsService.getFieldDefinitions).toHaveBeenCalledTimes(1);
      expect(fieldDefinitionsService.getFieldDefinitions).toHaveBeenCalledWith('securitySolution');
    });

    it('merges global and template fields, global wins on key collision', async () => {
      fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          makeFieldDef('priority', { label: 'Priority', type: 'keyword', control: 'INPUT_TEXT' }),
        ],
        total: 1,
      });
      templatesService.getTemplate.mockResolvedValue(
        makeTemplateSO([
          // Same key as the global field — should be ignored (global wins).
          { name: 'priority', label: 'Template Priority', type: 'keyword', control: 'INPUT_TEXT' },
          // Template-only field.
          { name: 'rollout', label: 'Rollout', type: 'keyword', control: 'TEXTAREA' },
        ]) as never
      );

      const result = await resolveApplicableFields({
        owner: 'securitySolution',
        templateId: 'tpl-1',
        templatesService: templatesService as unknown as TemplatesService,
        fieldDefinitionsService: fieldDefinitionsService as unknown as FieldDefinitionsService,
      });

      const byKey = Object.fromEntries(
        result.map((r) => [`${r.field.name}_as_${r.field.type}`, r.source])
      );
      expect(byKey.priority_as_keyword).toBe('global');
      expect(byKey.rollout_as_keyword).toBe('template');
      expect(result).toHaveLength(2);
    });

    it('flags a MARKDOWN template field as display-only alongside a global field', async () => {
      fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          makeFieldDef('global_tag', {
            label: 'global_tag',
            type: 'keyword',
            control: 'INPUT_TEXT',
          }),
        ],
        total: 1,
      });
      templatesService.getTemplate.mockResolvedValue(
        makeTemplateSO([
          { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', label: 'Summary' },
          { name: 'instructions', control: 'MARKDOWN', metadata: { content: '# Read me' } },
        ]) as never
      );

      const result = await resolveApplicableFields({
        owner: 'securitySolution',
        templateId: 'tpl-1',
        templatesService: templatesService as unknown as TemplatesService,
        fieldDefinitionsService: fieldDefinitionsService as unknown as FieldDefinitionsService,
      });

      const byKey = Object.fromEntries(
        result.map((r) => [getFieldSnakeKey(r.field.name, r.field.type), r])
      );
      expect(byKey.global_tag_as_keyword).toBeDefined();
      expect(byKey.summary_as_keyword).toBeDefined();
      expect(byKey.instructions_as_keyword.field.control).toBe('MARKDOWN');
    });

    it('throws when the template is not found', async () => {
      templatesService.getTemplate.mockResolvedValue(undefined);

      await expect(
        resolveApplicableFields({
          owner: 'securitySolution',
          templateId: 'missing',
          templatesService: templatesService as unknown as TemplatesService,
          fieldDefinitionsService: fieldDefinitionsService as unknown as FieldDefinitionsService,
        })
      ).rejects.toThrow('Template missing not found');
    });

    it('throws (does not leak the template) when the template belongs to a different owner', async () => {
      // makeTemplateSO always sets owner: 'securitySolution' — request as a different,
      // already-authorized owner to simulate a caller passing another owner's templateId.
      templatesService.getTemplate.mockResolvedValue(
        makeTemplateSO([
          { name: 'rollout', label: 'Rollout', type: 'keyword', control: 'TEXTAREA' },
        ]) as never
      );

      await expect(
        resolveApplicableFields({
          owner: 'observability',
          templateId: 'tpl-1',
          templatesService: templatesService as unknown as TemplatesService,
          fieldDefinitionsService: fieldDefinitionsService as unknown as FieldDefinitionsService,
        })
      ).rejects.toThrow('Template tpl-1 not found');
    });

    it('throws when the template has an invalid definition', async () => {
      templatesService.getTemplate.mockResolvedValue(
        makeTemplateSO([
          // An unknown control fails FieldSchema validation in parseTemplate.
          { name: 'broken', label: 'Broken', type: 'keyword', control: 'INVALID_CONTROL' },
        ]) as never
      );

      await expect(
        resolveApplicableFields({
          owner: 'securitySolution',
          templateId: 'tpl-1',
          templatesService: templatesService as unknown as TemplatesService,
          fieldDefinitionsService: fieldDefinitionsService as unknown as FieldDefinitionsService,
        })
      ).rejects.toThrow('Template tpl-1 has an invalid definition');
    });
  });
});
