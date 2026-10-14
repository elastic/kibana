/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import { ConnectorTypes } from '../../../../common/types/domain';
import { templateToYaml, templatesToYaml } from './templates_to_yaml';

// The export is serialized with the `yaml` library, so these tests assert the DATA round-trips
// (parse the produced YAML back) rather than exact formatting — the meaningful contract, since the
// export is consumed by the import parser.

const buildTemplate = (overrides: Partial<ParsedTemplate> = {}): ParsedTemplate => ({
  templateId: 'template-1',
  name: 'Template identity name',
  owner: 'securitySolution',
  templateVersion: 1,
  latestVersion: 1,
  isLatest: true,
  deletedAt: null,
  definitionString: '',
  definition: { name: 'Case default title', fields: [] },
  ...overrides,
});

describe('templatesToYaml', () => {
  it('round-trips template identity, case defaults, and every field-type shape', () => {
    const fields = [
      {
        name: 'severity',
        label: 'Severity',
        control: 'SELECT_BASIC',
        type: 'keyword',
        metadata: { options: ['low', 'medium', 'high'], default: 'medium' },
      },
      {
        name: 'affected',
        control: 'CHECKBOX_GROUP',
        type: 'keyword',
        metadata: { options: ['api', 'ui', 'db'], default: ['api', 'db'] },
      },
      {
        name: 'due_date',
        control: 'DATE_PICKER',
        type: 'date',
        metadata: { default: '2024-06-01T00:00:00.000Z', show_time: true, timezone: 'local' },
      },
      {
        name: 'reason',
        control: 'TEXTAREA',
        type: 'keyword',
        metadata: { markdown: true, default: '## Steps' },
        display: { show_when: { field: 'severity', operator: 'eq', value: 'high' } },
        validation: {
          required_when: { field: 'severity', operator: 'eq', value: 'critical' },
          pattern: { regex: '^[A-Z]+$', message: 'Must be uppercase' },
        },
      },
      { name: 'alias', $ref: 'lib_field', metadata: { default: 'override' } },
      { $ref: 'bare_ref' },
    ] as ParsedTemplate['definition']['fields'];

    const template = buildTemplate({
      description: 'Template identity description',
      tags: ['identity-tag'],
      author: 'alice',
      definition: {
        name: 'Case default title',
        description: 'Case default description',
        tags: ['case-tag'],
        severity: 'medium',
        category: 'Security',
        assignees: [{ uid: 'u1' }],
        fields,
      },
    });

    const parsed = parseYaml(templatesToYaml([template])) as Record<string, unknown>;

    // Identity vs case defaults stay distinct.
    expect(parsed.template_name).toEqual('Template identity name');
    expect(parsed.template_description).toEqual('Template identity description');
    expect(parsed.template_tags).toEqual(['identity-tag']);
    expect(parsed.name).toEqual('Case default title');
    expect(parsed.description).toEqual('Case default description');
    expect(parsed.tags).toEqual(['case-tag']);
    expect(parsed.severity).toEqual('medium');
    expect(parsed.category).toEqual('Security');
    expect(parsed.assignees).toEqual([{ uid: 'u1' }]);
    expect(parsed.owner).toEqual('securitySolution');
    expect(parsed.author).toEqual('alice');

    // Fields round-trip losslessly (a Date default parses back to an equivalent instant).
    const parsedFields = (parsed.definition as { fields: Array<Record<string, unknown>> }).fields;
    expect(parsedFields).toHaveLength(6);
    expect(parsedFields[0]).toMatchObject({
      name: 'severity',
      control: 'SELECT_BASIC',
      metadata: { options: ['low', 'medium', 'high'], default: 'medium' },
    });
    expect(parsedFields[1].metadata).toMatchObject({ default: ['api', 'db'] });
    expect(parsedFields[3]).toMatchObject({
      metadata: { markdown: true, default: '## Steps' },
      display: { show_when: { field: 'severity', operator: 'eq', value: 'high' } },
      validation: { pattern: { regex: '^[A-Z]+$', message: 'Must be uppercase' } },
    });
    expect(parsedFields[4]).toMatchObject({ name: 'alias', $ref: 'lib_field' });
    expect(parsedFields[5]).toEqual({ $ref: 'bare_ref' });
  });

  it('round-trips connector (per-type fields) and settings losslessly', () => {
    const template = buildTemplate({
      definition: {
        name: 'Case default title',
        fields: [],
        connector: {
          type: ConnectorTypes.jira,
          id: 'jira-1',
          fields: { issueType: '10001', priority: 'High', parent: null },
        },
        settings: { syncAlerts: false, extractObservables: true },
      },
    });

    const parsed = parseYaml(templateToYaml(template)) as Record<string, unknown>;

    expect(parsed.connector).toEqual({
      type: '.jira',
      id: 'jira-1',
      fields: { issueType: '10001', priority: 'High', parent: null },
    });
    expect(parsed.settings).toEqual({ syncAlerts: false, extractObservables: true });
  });

  it('escapes values that need quoting (tags with special characters) and round-trips them', () => {
    const trickyTags = ['#hashtag', 'key: value', '- leading dash', 'plain'];
    const template = buildTemplate({
      tags: trickyTags,
      definition: { name: 'Case: with colon # and dash', fields: [], tags: trickyTags },
    });

    const parsed = parseYaml(templateToYaml(template)) as Record<string, unknown>;

    expect(parsed.template_tags).toEqual(trickyTags);
    expect(parsed.tags).toEqual(trickyTags);
    expect(parsed.name).toEqual('Case: with colon # and dash');
  });

  it('omits connector and settings when the definition has neither', () => {
    const parsed = parseYaml(templateToYaml(buildTemplate())) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty('connector');
    expect(parsed).not.toHaveProperty('settings');
  });

  it('serializes multiple templates as separate YAML documents with a header', () => {
    const yaml = templatesToYaml([buildTemplate(), buildTemplate({ templateId: 'template-2' })]);
    expect(yaml).toContain('# Bulk Export: 2 templates');
    expect(yaml.match(/^---$/gm)).toHaveLength(2);
  });

  it('handles an empty templates array', () => {
    expect(templatesToYaml([])).toContain('# Bulk Export: 0 templates');
  });
});

describe('templateToYaml', () => {
  it('serializes a single template with a template header', () => {
    const yaml = templateToYaml(buildTemplate({ name: 'My template' }));
    expect(yaml).toContain('# Template: My template');
    const parsed = parseYaml(yaml) as Record<string, unknown>;
    expect(parsed.templateId).toEqual('template-1');
    expect(parsed.template_name).toEqual('My template');
  });
});
