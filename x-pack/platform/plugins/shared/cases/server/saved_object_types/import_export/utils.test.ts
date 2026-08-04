/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
  MAX_FIELD_DEFINITIONS_PER_OWNER,
} from '../../../common/constants';
import type { Template } from '../../../common/types/domain/template/latest';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import type { CasePersistedAttributes } from '../../common/types/case';
import {
  getAttachmentsAndUserActionsForCases,
  getTemplatesAndFieldDefinitionsForCases,
} from './utils';

const logger = loggingSystemMock.createLogger();

// Minimal case SO factory for use in unit tests
const makeCaseSO = (
  id: string,
  owner: string,
  template?: { id: string; version: number }
): SavedObject<CasePersistedAttributes> =>
  ({
    id,
    type: 'cases',
    references: [],
    attributes: { owner, template } as unknown as CasePersistedAttributes,
  } as SavedObject<CasePersistedAttributes>);

// Minimal template SO factory
const makeTemplateSO = (
  soId: string,
  attrs: Partial<Template> & {
    templateId: string;
    templateVersion: number;
    owner: string;
    name: string;
    deletedAt: string | null;
  }
): SavedObject<Template> =>
  ({
    id: soId,
    type: CASE_TEMPLATE_SAVED_OBJECT,
    references: [],
    attributes: {
      definition: yamlStringify({ fields: [] }),
      ...attrs,
    } as Template,
  } as SavedObject<Template>);

// Minimal field-def SO factory
const makeFieldDefSO = (
  soId: string,
  attrs: Partial<FieldDefinition> & { name: string; owner: string }
): SavedObject<FieldDefinition> =>
  ({
    id: soId,
    type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
    references: [],
    attributes: {
      fieldDefinitionId: soId,
      definition: '',
      ...attrs,
    } as FieldDefinition,
  } as SavedObject<FieldDefinition>);

describe('import_export utils', () => {
  describe('getAttachmentsAndUserActionsForCases', () => {
    it('always exports attachments from both legacy and unified attachment saved object types', async () => {
      const createPointInTimeFinder = jest.fn().mockReturnValue({
        async *find() {
          yield { saved_objects: [] };
        },
      });
      const savedObjectsClient = {
        createPointInTimeFinder,
      } as unknown as SavedObjectsClientContract;

      await getAttachmentsAndUserActionsForCases(savedObjectsClient, ['case-id']);

      expect(createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
        })
      );
      expect(createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CASE_USER_ACTION_SAVED_OBJECT,
        })
      );
    });
  });

  describe('getTemplatesAndFieldDefinitionsForCases', () => {
    it('returns empty array when there are no cases with an owner', async () => {
      // Empty cases input — nothing to fetch.
      const savedObjectsClient = {} as unknown as SavedObjectsClientContract;
      const result = await getTemplatesAndFieldDefinitionsForCases(savedObjectsClient, [], logger);
      expect(result).toEqual([]);
    });

    it('bundles global field definitions even when no case references a template', async () => {
      // A template-less case may carry extended_fields keyed by isGlobal definitions.
      // Those definitions must be bundled so the export is self-contained on import.
      const globalFieldDef = makeFieldDefSO('fd-global', {
        name: 'environment',
        owner: 'securitySolution',
        isGlobal: true,
      });
      const nonGlobalFieldDef = makeFieldDefSO('fd-non-global', {
        name: 'incident_type',
        owner: 'securitySolution',
        isGlobal: false,
      });

      // Only one find call expected — the field-def query. No template query should fire.
      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [globalFieldDef, nonGlobalFieldDef] });

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      // Template-less case (no template property)
      const cases = [makeCaseSO('case-1', 'securitySolution')];

      const result = await getTemplatesAndFieldDefinitionsForCases(
        savedObjectsClient,
        cases,
        logger
      );

      // The global def must be bundled; the non-global must not.
      const resultIds = result.map((so) => so.id);
      expect(resultIds).toContain('fd-global');
      expect(resultIds).not.toContain('fd-non-global');

      // No template SO should appear (no template query was needed).
      expect(result.filter((so) => so.type === CASE_TEMPLATE_SAVED_OBJECT)).toHaveLength(0);

      // Exactly one find call — the field-def query only.
      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ type: CASE_FIELD_DEFINITION_SAVED_OBJECT })
      );
    });

    it('fetches the template SO matching the case template reference', async () => {
      const templateSO = makeTemplateSO('tmpl-so-1', {
        templateId: 'tmpl-abc',
        templateVersion: 2,
        owner: 'securitySolution',
        name: 'My Template',
        deletedAt: null,
      });

      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [templateSO] }) // templates query
        .mockResolvedValueOnce({ saved_objects: [] }); // field defs query

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      const cases = [makeCaseSO('case-1', 'securitySolution', { id: 'tmpl-abc', version: 2 })];

      const result = await getTemplatesAndFieldDefinitionsForCases(
        savedObjectsClient,
        cases,
        logger
      );

      expect(result).toContainEqual(templateSO);
      // Template query must include templateId + templateVersion in filter
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CASE_TEMPLATE_SAVED_OBJECT,
          filter: expect.stringContaining('tmpl-abc'),
        })
      );
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CASE_TEMPLATE_SAVED_OBJECT,
          filter: expect.stringContaining('2'),
        })
      );
    });

    it('includes a soft-deleted template SO', async () => {
      const softDeletedSO = makeTemplateSO('tmpl-so-deleted', {
        templateId: 'tmpl-del',
        templateVersion: 1,
        owner: 'securitySolution',
        name: 'Deleted Template',
        deletedAt: '2024-01-01T00:00:00.000Z',
      });

      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [softDeletedSO] })
        .mockResolvedValueOnce({ saved_objects: [] });

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      const cases = [makeCaseSO('case-1', 'securitySolution', { id: 'tmpl-del', version: 1 })];

      const result = await getTemplatesAndFieldDefinitionsForCases(
        savedObjectsClient,
        cases,
        logger
      );

      expect(result).toContainEqual(softDeletedSO);
    });

    it('deduplicates template SOs when multiple cases reference the same template version', async () => {
      const templateSO = makeTemplateSO('tmpl-so-1', {
        templateId: 'tmpl-abc',
        templateVersion: 1,
        owner: 'securitySolution',
        name: 'Shared Template',
        deletedAt: null,
      });

      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [templateSO] }) // templates: single query for deduped ref
        .mockResolvedValueOnce({ saved_objects: [] });

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      const cases = [
        makeCaseSO('case-1', 'securitySolution', { id: 'tmpl-abc', version: 1 }),
        makeCaseSO('case-2', 'securitySolution', { id: 'tmpl-abc', version: 1 }),
      ];

      const result = await getTemplatesAndFieldDefinitionsForCases(
        savedObjectsClient,
        cases,
        logger
      );

      // Only one template SO, one templates find call with one entry in the filter
      expect(result.filter((so) => so.type === CASE_TEMPLATE_SAVED_OBJECT)).toHaveLength(1);
      const templateFindCall = find.mock.calls[0][0];
      // The filter should contain exactly one occurrence of the templateId
      expect((templateFindCall.filter as string).split('tmpl-abc')).toHaveLength(2); // 1 occurrence → 2 parts
    });

    it('includes global field definitions for the owners of exported cases', async () => {
      const templateSO = makeTemplateSO('tmpl-so-1', {
        templateId: 'tmpl-abc',
        templateVersion: 1,
        owner: 'securitySolution',
        name: 'My Template',
        deletedAt: null,
      });
      const globalFieldDef = makeFieldDefSO('fd-global', {
        name: 'environment',
        owner: 'securitySolution',
        isGlobal: true,
      });
      const nonGlobalFieldDef = makeFieldDefSO('fd-non-global', {
        name: 'some_field',
        owner: 'securitySolution',
        isGlobal: false,
      });

      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [templateSO] })
        .mockResolvedValueOnce({ saved_objects: [globalFieldDef, nonGlobalFieldDef] });

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      const cases = [makeCaseSO('case-1', 'securitySolution', { id: 'tmpl-abc', version: 1 })];

      const result = await getTemplatesAndFieldDefinitionsForCases(
        savedObjectsClient,
        cases,
        logger
      );

      const resultIds = result.map((so) => so.id);
      expect(resultIds).toContain('fd-global');
      expect(resultIds).not.toContain('fd-non-global'); // non-global, not $ref'd
    });

    it('includes field definitions referenced via $ref in the template YAML', async () => {
      const templateSO = makeTemplateSO('tmpl-so-1', {
        templateId: 'tmpl-abc',
        templateVersion: 1,
        owner: 'securitySolution',
        name: 'My Template',
        definition: yamlStringify({
          fields: [{ $ref: 'incident_type' }],
        }),
        deletedAt: null,
      });
      const refFieldDef = makeFieldDefSO('fd-ref', {
        name: 'incident_type',
        owner: 'securitySolution',
      });
      const unrelatedFieldDef = makeFieldDefSO('fd-other', {
        name: 'other_field',
        owner: 'securitySolution',
      });

      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [templateSO] })
        .mockResolvedValueOnce({ saved_objects: [refFieldDef, unrelatedFieldDef] });

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      const cases = [makeCaseSO('case-1', 'securitySolution', { id: 'tmpl-abc', version: 1 })];

      const result = await getTemplatesAndFieldDefinitionsForCases(
        savedObjectsClient,
        cases,
        logger
      );

      const resultIds = result.map((so) => so.id);
      expect(resultIds).toContain('fd-ref');
      expect(resultIds).not.toContain('fd-other');
    });

    it("deduplicates field defs that are both global and $ref'd by a template", async () => {
      const templateSO = makeTemplateSO('tmpl-so-1', {
        templateId: 'tmpl-abc',
        templateVersion: 1,
        owner: 'securitySolution',
        name: 'My Template',
        definition: yamlStringify({
          fields: [{ $ref: 'environment' }],
        }),
        deletedAt: null,
      });
      const globalAndRefFieldDef = makeFieldDefSO('fd-both', {
        name: 'environment',
        owner: 'securitySolution',
        isGlobal: true,
      });

      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [templateSO] })
        .mockResolvedValueOnce({ saved_objects: [globalAndRefFieldDef] });

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      const cases = [makeCaseSO('case-1', 'securitySolution', { id: 'tmpl-abc', version: 1 })];

      const result = await getTemplatesAndFieldDefinitionsForCases(
        savedObjectsClient,
        cases,
        logger
      );

      const fieldDefResults = result.filter((so) => so.type === CASE_FIELD_DEFINITION_SAVED_OBJECT);
      expect(fieldDefResults).toHaveLength(1);
      expect(fieldDefResults[0].id).toBe('fd-both');
    });

    it('logs a warning and skips $ref collection when a template definition is invalid YAML', async () => {
      const templateWithBadDef = makeTemplateSO('tmpl-so-bad', {
        templateId: 'tmpl-bad',
        templateVersion: 1,
        owner: 'securitySolution',
        name: 'Bad Template',
        definition: 'fields: [invalid: yaml: {unclosed',
        deletedAt: null,
      });

      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [templateWithBadDef] })
        .mockResolvedValueOnce({ saved_objects: [] });

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      const cases = [makeCaseSO('case-1', 'securitySolution', { id: 'tmpl-bad', version: 1 })];

      await expect(
        getTemplatesAndFieldDefinitionsForCases(savedObjectsClient, cases, logger)
      ).resolves.not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('tmpl-bad'));
    });

    it('queries field definitions using the owner(s) from the exported cases', async () => {
      const templateSO = makeTemplateSO('tmpl-so-1', {
        templateId: 'tmpl-abc',
        templateVersion: 1,
        owner: 'securitySolution',
        name: 'My Template',
        deletedAt: null,
      });

      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [templateSO] })
        .mockResolvedValueOnce({ saved_objects: [] });

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      const cases = [makeCaseSO('case-1', 'securitySolution', { id: 'tmpl-abc', version: 1 })];

      await getTemplatesAndFieldDefinitionsForCases(savedObjectsClient, cases, logger);

      const fieldDefFindCall = find.mock.calls[1][0];
      expect(fieldDefFindCall.type).toBe(CASE_FIELD_DEFINITION_SAVED_OBJECT);
      expect(fieldDefFindCall.filter).toContain('securitySolution');
    });

    it('queries field definitions for all unique owners across exported cases', async () => {
      const templateSOSecurity = makeTemplateSO('tmpl-so-sec', {
        templateId: 'tmpl-sec',
        templateVersion: 1,
        owner: 'securitySolution',
        name: 'Security Template',
        deletedAt: null,
      });
      const templateSOObs = makeTemplateSO('tmpl-so-obs', {
        templateId: 'tmpl-obs',
        templateVersion: 1,
        owner: 'observability',
        name: 'Obs Template',
        deletedAt: null,
      });

      const find = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [templateSOSecurity, templateSOObs] })
        .mockResolvedValueOnce({ saved_objects: [] });

      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;
      const cases = [
        makeCaseSO('case-1', 'securitySolution', { id: 'tmpl-sec', version: 1 }),
        makeCaseSO('case-2', 'observability', { id: 'tmpl-obs', version: 1 }),
      ];

      await getTemplatesAndFieldDefinitionsForCases(savedObjectsClient, cases, logger);

      const fieldDefFindCall = find.mock.calls[1][0];
      expect(fieldDefFindCall.type).toBe(CASE_FIELD_DEFINITION_SAVED_OBJECT);
      expect(fieldDefFindCall.filter).toContain('securitySolution');
      expect(fieldDefFindCall.filter).toContain('observability');
      expect(fieldDefFindCall.perPage).toBe(MAX_FIELD_DEFINITIONS_PER_OWNER * 2);
    });

    it('caps the template find perPage at MAX_DOCS_PER_PAGE even when unique template refs exceed it', async () => {
      const cases = Array.from({ length: MAX_DOCS_PER_PAGE + 1 }, (_, i) =>
        makeCaseSO(`case-${i}`, 'securitySolution', { id: `tmpl-${i}`, version: 1 })
      );

      const find = jest.fn().mockResolvedValue({ saved_objects: [] });
      const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;

      await getTemplatesAndFieldDefinitionsForCases(savedObjectsClient, cases, logger);

      const templateFindCall = find.mock.calls[0][0];
      expect(templateFindCall.perPage).toBe(MAX_DOCS_PER_PAGE);
    });
  });
});
