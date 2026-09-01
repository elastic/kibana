/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument, parse as parseYaml } from 'yaml';
import { reorderTemplateDefinitionKeys } from './reorder_template_definition_keys';

const reorder = (yaml: string): { changed: boolean; text: string } => {
  const doc = parseDocument(yaml);
  const changed = reorderTemplateDefinitionKeys(doc);
  return { changed, text: doc.toString() };
};

describe('reorderTemplateDefinitionKeys', () => {
  it('orders case defaults to match the render panel and appends fields last', () => {
    const { changed, text } = reorder(
      `fields: []\nassignees: []\ntags:\n  - a\ncategory: General\nseverity: low\ndescription: d\nname: Title\n`
    );

    expect(changed).toBe(true);
    expect(Object.keys(parseYaml(text) as Record<string, unknown>)).toEqual([
      'name',
      'description',
      'severity',
      'category',
      'tags',
      'assignees',
      'fields',
    ]);
  });

  it('keeps unranked keys (e.g. settings/connector) after the canonical keys, in relative order', () => {
    const { text } = reorder(
      `settings:\n  syncAlerts: false\nconnector:\n  type: .none\nfields: []\nseverity: low\n`
    );

    expect(Object.keys(parseYaml(text) as Record<string, unknown>)).toEqual([
      'severity',
      'fields',
      'settings',
      'connector',
    ]);
  });

  it('is a no-op (returns false, preserves the buffer) when already canonical', () => {
    const canonical = `name: Title\nseverity: low\nfields: []\n`;
    const doc = parseDocument(canonical);

    expect(reorderTemplateDefinitionKeys(doc)).toBe(false);
    expect(doc.toString()).toBe(canonical);
  });

  it('moves each key comment with its key', () => {
    const { text } = reorder(`# custom fields\nfields: []\n# case defaults\nname: Title\n`);

    // The comment travels with `fields` to the bottom, and the `name` comment stays attached to it.
    expect(text).toBe(`# case defaults\nname: Title\n# custom fields\nfields: []\n`);
  });

  it('returns false for a non-map document', () => {
    expect(reorderTemplateDefinitionKeys(parseDocument(''))).toBe(false);
    expect(reorderTemplateDefinitionKeys(parseDocument('just a scalar'))).toBe(false);
  });
});
