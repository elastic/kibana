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
