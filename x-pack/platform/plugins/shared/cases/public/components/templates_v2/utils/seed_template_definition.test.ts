/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import { seedRequiredTemplateBlocks } from './seed_template_definition';
import { validateTemplateDefinitionYaml } from './validate_template_definition';

describe('seedRequiredTemplateBlocks', () => {
  it('seeds only the structural fields block, leaving optional case defaults untouched', () => {
    const seeded = seedRequiredTemplateBlocks('name: Only a title\n');
    const parsed = parseYaml(seeded) as Record<string, unknown>;

    // Case defaults are optional and never injected — only the structural `fields` block is seeded.
    expect(Object.keys(parsed).sort()).toEqual(['fields', 'name'].sort());
    expect(parsed.fields).toEqual([]);
    expect(parsed).not.toHaveProperty('severity');
    expect(parsed).not.toHaveProperty('description');
    expect(parsed).not.toHaveProperty('category');
    expect(parsed).not.toHaveProperty('tags');
    expect(parsed).not.toHaveProperty('assignees');
    expect(seeded).not.toContain('null');
    // Connector and settings are panel state under the Fields/Configuration split — never seeded.
    expect(parsed).not.toHaveProperty('connector');
    expect(parsed).not.toHaveProperty('settings');
  });

  it('never writes template identity keys', () => {
    const seeded = seedRequiredTemplateBlocks('name: Only a title\n');
    expect(seeded).not.toContain('template_name');
    expect(seeded).not.toContain('template_description');
    expect(seeded).not.toContain('template_tags');
  });

  it('orders case defaults to match the render panel and appends the fields block last', () => {
    // Author-typed order (defaults out of render order, fields in the middle).
    const seeded = seedRequiredTemplateBlocks(
      `severity: high\nname: Only a title\nfields: []\ntags:\n  - a\n`
    );

    // Case defaults follow render-panel order (name → severity → tags) and `fields` is last.
    expect(Object.keys(parseYaml(seeded) as Record<string, unknown>)).toEqual([
      'name',
      'severity',
      'tags',
      'fields',
    ]);
  });

  it('preserves a canonically-ordered complete definition verbatim (no re-serialization)', () => {
    // Already in canonical order (case defaults in render-panel order, `fields` last), so nothing is
    // seeded or reordered.
    const complete = `name: Case title
description: ""
severity: low
category: ""
tags: []
assignees: []
fields: []
settings:
  syncAlerts: false
  extractObservables: false
connector:
  type: .none
  id: none
  fields: null
`;
    expect(seedRequiredTemplateBlocks(complete)).toBe(complete);
  });

  it('does not overwrite existing values', () => {
    const seeded = seedRequiredTemplateBlocks('name: Title\nseverity: high\ntags:\n  - a\n');
    const parsed = parseYaml(seeded) as Record<string, unknown>;
    expect(parsed.severity).toBe('high');
    expect(parsed.tags).toEqual(['a']);
  });
});

describe('migrated template previews after seeding (regression: Jira migration preview error)', () => {
  // What the v1 → v2 migration (buildTemplateYaml) emits for a legacy template that only had a Jira
  // connector and a case title — no settings/assignees/description/severity/category/tags.
  const migratedJiraDefinition = `name: Jira default title
connector:
  type: .jira
  id: my-connector
  fields:
    issueType: "10001"
    priority: High
    parent: null
fields:
  - $ref: cf_text
`;

  it('is previewable as-is (case defaults optional) and stays valid after seeding', () => {
    // With case defaults optional, a migrated definition carrying only a title + connector + fields
    // is already valid — no seeding is required to preview it, and seeding leaves it valid.
    expect(validateTemplateDefinitionYaml(migratedJiraDefinition).success).toBe(true);

    const seeded = seedRequiredTemplateBlocks(migratedJiraDefinition);
    expect(validateTemplateDefinitionYaml(seeded).success).toBe(true);
  });

  it('preserves the migrated Jira connector fields through seeding', () => {
    const seeded = seedRequiredTemplateBlocks(migratedJiraDefinition);
    const parsed = parseYaml(seeded) as {
      connector?: { type: string; id: string; fields: Record<string, unknown> };
    };
    expect(parsed.connector).toEqual({
      type: '.jira',
      id: 'my-connector',
      fields: { issueType: '10001', priority: 'High', parent: null },
    });
  });
});
