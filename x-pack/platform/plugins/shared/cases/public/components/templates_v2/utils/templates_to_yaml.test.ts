/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import { templateToYaml, templatesToYaml } from './templates_to_yaml';

describe('templatesToYaml', () => {
  it('serializes templates to YAML with tags and fields', () => {
    const templates: ParsedTemplate[] = [
      {
        templateId: 'template-1',
        name: 'My template',
        owner: 'securitySolution',
        description: 'Some description',
        tags: ['tag-a', 'tag-b'],
        author: 'alice',
        usageCount: 2,
        fieldCount: 2,
        lastUsedAt: '2024-01-02T00:00:00.000Z',
        isDefault: true,
        templateVersion: 3,
        latestVersion: 3,
        isLatest: true,
        deletedAt: null,
        definition: {
          name: 'My template',
          fields: [
            {
              name: 'severity',
              label: 'Severity',
              control: 'SELECT_BASIC',
              type: 'keyword',
              metadata: {
                options: ['low', 'medium'],
                default: 'medium',
              },
            },
            {
              name: 'summary',
              label: 'Summary',
              control: 'INPUT_TEXT',
              type: 'keyword',
              metadata: {},
            },
          ],
        },
      },
    ];

    const yaml = templatesToYaml(templates);

    expect(yaml).toContain('templateId: "template-1"');
    expect(yaml).toContain('name: "My template"');
    expect(yaml).toContain('owner: "securitySolution"');
    expect(yaml).toContain('author: "alice"');
    expect(yaml).toContain('tags:');
    expect(yaml).toContain('  - "tag-a"');
    expect(yaml).toContain('  - "tag-b"');

    // Definition fields
    expect(yaml).toContain('definition:');
    expect(yaml).toContain('  fields:');
    expect(yaml).toContain('    - name: "severity"');
    expect(yaml).toContain('      control: "SELECT_BASIC"');
    expect(yaml).toContain('      metadata:');
    expect(yaml).toContain('        options:');
    expect(yaml).toContain('          - "low"');
    expect(yaml).toContain('          - "medium"');
    expect(yaml).toContain('        default: "medium"');

    // Non-select field should not include select metadata block
    expect(yaml).toContain('    - name: "summary"');
    expect(yaml).toContain('      control: "INPUT_TEXT"');
  });

  it('handles empty templates array', () => {
    const yaml = templatesToYaml([]);

    expect(yaml).toContain('# Bulk Export: 0 templates');
  });

  it('serializes DATE_PICKER field with show_time, timezone and default', () => {
    const templates: ParsedTemplate[] = [
      {
        templateId: 'template-dp',
        name: 'DatePicker Template',
        owner: 'securitySolution',
        templateVersion: 1,
        latestVersion: 1,
        isLatest: true,
        deletedAt: null,
        definition: {
          name: 'DatePicker Template',
          fields: [
            {
              name: 'due_date',
              label: 'Due date',
              control: 'DATE_PICKER',
              type: 'date',
              metadata: {
                default: '2024-06-01T00:00:00.000Z',
                show_time: true,
                timezone: 'local',
              },
            },
          ],
        },
      },
    ];

    const yaml = templatesToYaml(templates);

    expect(yaml).toContain('      metadata:');
    expect(yaml).toContain('        default: "2024-06-01T00:00:00.000Z"');
    expect(yaml).toContain('        show_time: true');
    expect(yaml).toContain('        timezone: local');
  });

  it('serializes DATE_PICKER default when js-yaml parses it as a Date object (unquoted ISO)', () => {
    const templates: ParsedTemplate[] = [
      {
        templateId: 'template-dp',
        name: 'DatePicker Template',
        owner: 'securitySolution',
        templateVersion: 1,
        latestVersion: 1,
        isLatest: true,
        deletedAt: null,
        definition: {
          name: 'DatePicker Template',
          fields: [
            {
              name: 'due_date',
              control: 'DATE_PICKER',
              type: 'date',
              // js-yaml parses unquoted ISO timestamps as native Date objects
              metadata: { default: new Date('2024-06-01T00:00:00.000Z') } as unknown as {
                show_time?: boolean;
                timezone?: 'utc' | 'local';
              },
            },
          ],
        },
      },
    ];

    const yaml = templatesToYaml(templates);

    expect(yaml).toContain('        default: "2024-06-01T00:00:00.000Z"');
  });

  it('serializes DATE_PICKER field without optional metadata when absent', () => {
    const templates: ParsedTemplate[] = [
      {
        templateId: 'template-dp',
        name: 'DatePicker Template',
        owner: 'securitySolution',
        templateVersion: 1,
        latestVersion: 1,
        isLatest: true,
        deletedAt: null,
        definition: {
          name: 'DatePicker Template',
          fields: [
            {
              name: 'due_date',
              control: 'DATE_PICKER',
              type: 'date',
            },
          ],
        },
      },
    ];

    const yaml = templatesToYaml(templates);

    expect(yaml).not.toContain('show_time');
    expect(yaml).not.toContain('timezone');
  });

  it('serializes fields with display show_when conditions', () => {
    const templates: ParsedTemplate[] = [
      {
        templateId: 'template-cond',
        name: 'Conditions Template',
        owner: 'securitySolution',
        templateVersion: 1,
        latestVersion: 1,
        isLatest: true,
        deletedAt: null,
        definition: {
          name: 'Conditions Template',
          fields: [
            {
              name: 'urgency_reason',
              control: 'TEXTAREA',
              type: 'keyword',
              display: {
                show_when: { field: 'priority', operator: 'eq', value: 'urgent' },
              },
            },
          ],
        },
      },
    ];

    const yaml = templatesToYaml(templates);

    expect(yaml).toContain('      display:');
    expect(yaml).toContain('show_when:');
    expect(yaml).toContain('field: priority');
    expect(yaml).toContain('operator: eq');
    expect(yaml).toContain('value: urgent');
  });

  it('serializes fields with validation rules', () => {
    const templates: ParsedTemplate[] = [
      {
        templateId: 'template-val',
        name: 'Validation Template',
        owner: 'securitySolution',
        templateVersion: 1,
        latestVersion: 1,
        isLatest: true,
        deletedAt: null,
        definition: {
          name: 'Validation Template',
          fields: [
            {
              name: 'score',
              control: 'INPUT_NUMBER',
              type: 'integer',
              validation: { required: true, min: 0, max: 100 },
            },
            {
              name: 'code',
              control: 'INPUT_TEXT',
              type: 'keyword',
              validation: {
                min_length: 3,
                max_length: 10,
                pattern: { regex: '^[A-Z]+$', message: 'Must be uppercase' },
              },
            },
          ],
        },
      },
    ];

    const yaml = templatesToYaml(templates);

    expect(yaml).toContain('      validation:');
    expect(yaml).toContain('required: true');
    expect(yaml).toContain('min: 0');
    expect(yaml).toContain('max: 100');
    expect(yaml).toContain('min_length: 3');
    expect(yaml).toContain('max_length: 10');
    expect(yaml).toContain('regex: ^[A-Z]+$');
    expect(yaml).toContain('message: Must be uppercase');
  });

  it('serializes template-level severity, category and isEnabled', () => {
    const templates: ParsedTemplate[] = [
      {
        templateId: 'template-meta',
        name: 'Meta Template',
        owner: 'securitySolution',
        templateVersion: 1,
        latestVersion: 1,
        isLatest: true,
        isEnabled: false,
        deletedAt: null,
        definition: {
          name: 'Meta Template',
          severity: 'high',
          category: 'Security',
          fields: [],
        },
      },
    ];

    const yaml = templatesToYaml(templates);

    expect(yaml).toContain('severity: high');
    expect(yaml).toContain('category: "Security"');
    expect(yaml).toContain('isEnabled: false');
  });
});

describe('templateToYaml', () => {
  it('serializes a single template with a template header', () => {
    const template: ParsedTemplate = {
      templateId: 'template-1',
      name: 'My template',
      owner: 'securitySolution',
      description: 'Some description',
      tags: ['tag-a'],
      author: 'alice',
      usageCount: 2,
      fieldCount: 1,
      templateVersion: 1,
      latestVersion: 1,
      isLatest: true,
      deletedAt: null,
      definition: {
        name: 'My template',
        fields: [
          {
            name: 'summary',
            control: 'INPUT_TEXT',
            type: 'keyword',
            metadata: {},
          },
        ],
      },
    };

    const yaml = templateToYaml(template);

    expect(yaml).toContain('# Template: My template');
    expect(yaml).toContain('templateId: "template-1"');
    expect(yaml).toContain('author: "alice"');
  });
});
