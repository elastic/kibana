/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TAGS_PER_CASE } from '../../../../common/constants';
import type { Case, CaseConnector } from '../../../../common/types/domain';
import { CaseSeverity, ConnectorTypes, CustomFieldTypes } from '../../../../common/types/domain';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { basicCaseFields } from '../../../services/test_utils';
import type { BuildMergeFieldsArgs, MergeTemplates } from './fields';
import { buildMergeFields, getUnresolvedConflicts, templateVersionKey } from './fields';

const makeCase = (id: string, createdAt: string, overrides: Partial<Case> = {}): Case => ({
  ...basicCaseFields,
  id,
  version: `${id}-version`,
  totalComment: 0,
  totalAlerts: 0,
  created_at: createdAt,
  ...overrides,
});

const first = makeCase('case-1', '2024-01-01T00:00:00.000Z', { title: 'Phishing' });
const second = makeCase('case-2', '2024-02-01T00:00:00.000Z', { title: 'Phishing follow-up' });
const third = makeCase('case-3', '2024-03-01T00:00:00.000Z', { title: 'Phishing again' });

const noTemplates: MergeTemplates = {
  enabled: true,
  candidates: new Map(),
  fieldsByVersion: new Map(),
};

const build = (args: Partial<BuildMergeFieldsArgs> & Pick<BuildMergeFieldsArgs, 'orderedCases'>) =>
  buildMergeFields({
    customFieldsConfiguration: [],
    linkedStorageKeys: new Set(),
    templates: noTemplates,
    globalFields: [],
    canChangeAssignees: true,
    assigneesUnavailableReason: null,
    ...args,
  });

const field = (name: string, overrides: Partial<InlineField> = {}) =>
  ({
    name,
    label: name,
    type: 'keyword',
    control: 'INPUT_TEXT',
    ...overrides,
  } as InlineField);

const jira = (id: string): CaseConnector => ({
  id,
  name: id,
  type: ConnectorTypes.jira,
  fields: { issueType: '1', priority: null, parent: null },
});

describe('buildMergeFields', () => {
  describe('into a new case', () => {
    it('suggests the oldest case title and description, and flags them as conflicts', () => {
      const { fields, conflicts, values } = build({
        orderedCases: [first, { ...second, description: 'Other' }],
      });

      expect(fields.title).toEqual(
        expect.objectContaining({
          value: 'Phishing',
          provenance: 'oldest',
          sourceCaseId: first.id,
          hasConflict: true,
        })
      );
      expect(fields.description.combinedValue).toContain('Other');
      expect(conflicts).toEqual([
        { field: 'title', reason: 'differentValues', resolved: false },
        { field: 'description', reason: 'differentValues', resolved: false },
      ]);
      expect(values.title).toBe('Phishing');
    });

    it('takes the request value for a conflict and marks it resolved', () => {
      const { conflicts, values } = build({
        orderedCases: [first, second],
        requestFields: { title: 'Phishing campaign' },
      });

      expect(getUnresolvedConflicts(conflicts)).toEqual([]);
      expect(values.title).toBe('Phishing campaign');
    });

    it('suggests the highest severity', () => {
      const { fields } = build({
        orderedCases: [
          { ...first, severity: CaseSeverity.MEDIUM },
          { ...second, severity: CaseSeverity.HIGH },
          { ...third, severity: CaseSeverity.LOW },
        ],
      });

      expect(fields.severity).toEqual(
        expect.objectContaining({ value: CaseSeverity.HIGH, provenance: 'highest' })
      );
    });

    it('treats the none connector as empty and conflicts on two connectors', () => {
      const { fields } = build({
        orderedCases: [
          first,
          { ...second, connector: jira('jira-1') },
          { ...third, connector: jira('jira-2') },
        ],
      });

      expect(fields.connector).toEqual(
        expect.objectContaining({ value: jira('jira-1'), provenance: 'oldest', hasConflict: true })
      );
    });

    it('combines tags and assignees without conflicts, and reports going over a limit', () => {
      const manyTags = Array.from({ length: MAX_TAGS_PER_CASE }, (_, i) => `tag-${i}`);
      const { fields, conflicts, limits } = build({
        orderedCases: [
          { ...first, title: 'Same', tags: manyTags, assignees: [{ uid: 'u1' }] },
          { ...second, title: 'Same', tags: ['extra'], assignees: [{ uid: 'u2' }] },
        ],
      });

      expect(fields.tags).toEqual(
        expect.objectContaining({ provenance: 'combined', overBy: 1, max: MAX_TAGS_PER_CASE })
      );
      expect(fields.assignees.value).toEqual([{ uid: 'u1' }, { uid: 'u2' }]);
      expect(conflicts).toEqual([]);
      expect(limits).toEqual([
        { kind: 'tags', max: MAX_TAGS_PER_CASE, total: MAX_TAGS_PER_CASE + 1, overBy: 1 },
      ]);
    });

    it('gives a new case no assignees when the user cannot assign', () => {
      const { fields } = build({
        orderedCases: [{ ...first, assignees: [{ uid: 'u1' }] }, second],
        canChangeAssignees: false,
        assigneesUnavailableReason: 'license',
      });

      expect(fields.assignees).toEqual(
        expect.objectContaining({ value: [], canChange: false, unavailableReason: 'license' })
      );
    });
  });

  describe('into an existing case', () => {
    it('suggests the destination own values and fills its empty fields from the oldest source', () => {
      const { fields } = build({
        orderedCases: [{ ...third, category: null }, { ...first, category: 'Malware' }, second],
        destination: { ...third, category: null },
      });

      expect(fields.title).toEqual(
        expect.objectContaining({
          value: 'Phishing again',
          provenance: 'destination',
          sourceCaseId: third.id,
          hasConflict: true,
        })
      );
      expect(fields.category).toEqual(
        expect.objectContaining({ value: 'Malware', provenance: 'only', hasConflict: false })
      );
    });

    it('suggests the highest severity, the destination own included', () => {
      const { fields } = build({
        orderedCases: [
          { ...third, severity: CaseSeverity.CRITICAL },
          { ...first, severity: CaseSeverity.LOW },
        ],
        destination: { ...third, severity: CaseSeverity.CRITICAL },
      });

      expect(fields.severity.value).toBe(CaseSeverity.CRITICAL);
    });

    it('keeps the destination assignees when the user cannot assign', () => {
      const destination = { ...third, assignees: [{ uid: 'owner' }] };
      const { fields } = build({
        orderedCases: [destination, { ...first, assignees: [{ uid: 'u1' }] }],
        destination,
        canChangeAssignees: false,
        assigneesUnavailableReason: 'privilege',
      });

      expect(fields.assignees.value).toEqual([{ uid: 'owner' }]);
    });
  });

  describe('custom fields', () => {
    const customFieldsConfiguration = [
      { key: 'verdict', type: CustomFieldTypes.TEXT, label: 'Verdict', required: true },
      { key: 'escalated', type: CustomFieldTypes.TOGGLE, label: 'Escalated', required: false },
    ];

    it('conflicts on different values and requires a value for a required field', () => {
      const { fields, conflicts } = build({
        orderedCases: [
          {
            ...first,
            title: 'Same',
            customFields: [{ key: 'escalated', type: CustomFieldTypes.TOGGLE, value: true }],
          },
          {
            ...second,
            title: 'Same',
            customFields: [{ key: 'escalated', type: CustomFieldTypes.TOGGLE, value: false }],
          },
        ],
        customFieldsConfiguration,
      });

      expect(fields.customFields.map(({ key, hasConflict }) => [key, hasConflict])).toEqual([
        ['verdict', false],
        ['escalated', true],
      ]);
      expect(conflicts).toEqual([
        {
          field: 'customFields',
          key: 'verdict',
          label: 'Verdict',
          reason: 'required',
          resolved: false,
        },
        {
          field: 'customFields',
          key: 'escalated',
          label: 'Escalated',
          reason: 'differentValues',
          resolved: false,
        },
      ]);
    });
  });

  describe('templates', () => {
    const templates: MergeTemplates = {
      enabled: true,
      candidates: new Map([
        ['t-a', { id: 't-a', name: 'Phishing', isEnabled: true, version: 3 }],
        ['t-b', { id: 't-b', name: 'Malware', isEnabled: true, version: 1 }],
        ['t-off', { id: 't-off', name: 'Old', isEnabled: false, version: 2 }],
      ]),
      fieldsByVersion: new Map([
        [
          templateVersionKey('t-a', 3),
          [
            field('verdict', { validation: { required: true } }),
            field('tier', {
              control: 'SELECT_BASIC',
              metadata: { options: ['gold', 'silver'], default: 'silver' },
            } as Partial<InlineField>),
            field('labels', {
              control: 'CHECKBOX_GROUP',
              metadata: { options: ['a', 'b', 'c'] },
            } as Partial<InlineField>),
          ],
        ],
        [templateVersionKey('t-a', 2), [field('verdict')]],
      ]),
    };

    const withTemplate = (theCase: Case, id: string, version = 1): Case => ({
      ...theCase,
      title: 'Same',
      template: { id, version },
    });

    it('suggests the template most sources use, ties going to the oldest case', () => {
      const { fields, effectiveTemplate } = build({
        orderedCases: [
          withTemplate(first, 't-b'),
          withTemplate(second, 't-a'),
          withTemplate(third, 't-a'),
        ],
        templates,
      });

      expect(fields.template).toEqual(
        expect.objectContaining({
          value: { id: 't-a', name: 'Phishing', isEnabled: true },
          provenance: 'mostUsed',
          hasConflict: true,
        })
      );
      expect(effectiveTemplate).toEqual({ id: 't-a', version: 3, name: 'Phishing' });

      const tie = build({
        orderedCases: [withTemplate(first, 't-b'), withTemplate(second, 't-a')],
        templates,
      });
      expect(tie.fields.template.value?.id).toBe('t-b');
    });

    it('never suggests a disabled template, and refuses one in the request', () => {
      const orderedCases = [withTemplate(first, 't-off'), { ...second, title: 'Same' }];

      expect(build({ orderedCases, templates }).fields.template.value).toBeNull();
      expect(() =>
        build({ orderedCases, templates, requestFields: { template: { id: 't-off' } } })
      ).toThrow(/cannot be applied/);
    });

    it('keeps the destination template at the version it pinned', () => {
      const destination = withTemplate(third, 't-a', 2);
      const { effectiveTemplate } = build({
        orderedCases: [destination, withTemplate(first, 't-b')],
        destination,
        templates,
        requestFields: { template: { id: 't-a' } },
      });

      expect(effectiveTemplate).toEqual({ id: 't-a', version: 2, name: 'Phishing' });
    });

    it('applies no template when the request asks for none', () => {
      const { values, fields } = build({
        orderedCases: [withTemplate(first, 't-a'), withTemplate(second, 't-b')],
        templates,
        requestFields: { template: null },
      });

      expect(values.template).toBeNull();
      expect(fields.extendedFields).toEqual([]);
    });

    it('matches template fields by key, fills defaults, combines multi-value fields and checks the result', () => {
      const { fields, conflicts, values } = build({
        orderedCases: [
          {
            ...withTemplate(first, 't-a', 3),
            extended_fields: { labels_as_keyword: '["a"]', region_as_keyword: 'emea' },
          },
          {
            ...withTemplate(second, 't-a', 3),
            extended_fields: { labels_as_keyword: '["b","z"]' },
          },
        ],
        templates,
      });

      expect(
        fields.extendedFields.map(({ key, value, provenance }) => [key, value, provenance])
      ).toEqual([
        ['verdict_as_keyword', '', 'none'],
        ['tier_as_keyword', 'silver', 'templateDefault'],
        ['labels_as_keyword', '["a","b","z"]', 'combined'],
      ]);
      expect(conflicts).toEqual([
        expect.objectContaining({
          field: 'extendedFields',
          key: 'verdict_as_keyword',
          reason: 'required',
        }),
        expect.objectContaining({
          field: 'extendedFields',
          key: 'labels_as_keyword',
          reason: 'invalidValue',
        }),
      ]);
      expect(values.extendedFields).toEqual({
        tier_as_keyword: 'silver',
        labels_as_keyword: '["a","b","z"]',
      });
      expect(fields.notCopiedFields).toEqual([
        { key: 'region_as_keyword', label: 'region', caseIds: [first.id] },
      ]);
    });

    it('leaves template fields mirrored from a legacy custom field to the custom field row', () => {
      const { fields } = build({
        orderedCases: [withTemplate(first, 't-a', 3), withTemplate(second, 't-a', 3)],
        templates,
        linkedStorageKeys: new Set(['verdict_as_keyword']),
      });

      expect(fields.extendedFields.map(({ key }) => key)).not.toContain('verdict_as_keyword');
    });

    it('leaves templates alone when the feature is off', () => {
      const destination = withTemplate(third, 't-a', 2);
      const result = build({
        orderedCases: [destination, withTemplate(first, 't-b')],
        destination,
        templates: { ...noTemplates, enabled: false },
      });

      expect(result.conflicts).toEqual([]);
      expect(result.values.template).toEqual({ id: 't-a', version: 2 });
    });
  });
});
