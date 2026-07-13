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
  it('adds every missing case-default + fields block (but NOT connector/settings — those are panel-owned)', () => {
    const seeded = seedRequiredTemplateBlocks('name: Only a title\n');
    const parsed = parseYaml(seeded) as Record<string, unknown>;

    expect(Object.keys(parsed).sort()).toEqual(
      ['assignees', 'category', 'description', 'fields', 'name', 'severity', 'tags'].sort()
    );
    expect(parsed.tags).toEqual([]);
    expect(parsed.assignees).toEqual([]);
    expect(parsed.description).toBeNull();
    expect(parsed.severity).toBeNull();
    expect(parsed.category).toBeNull();
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

  it('preserves a complete definition verbatim (no re-serialization)', () => {
    const complete = `name: Case title
description: ""
severity: low
category: ""
tags: []
assignees: []
settings:
  syncAlerts: false
  extractObservables: false
connector:
  type: .none
  id: none
  fields: null
fields: []
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

  it('is incomplete on its own but becomes previewable once seeded', () => {
    // Before seeding it is missing required blocks, so the editor would show a validation error.
    expect(validateTemplateDefinitionYaml(migratedJiraDefinition).success).toBe(false);

    // The editor seeds the initial value on load; the seeded definition previews cleanly.
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
