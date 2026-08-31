/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YAMLMap } from 'yaml';
import { isMap, parseDocument } from 'yaml';
import { reorderTemplateDefinitionKeys } from './reorder_template_definition_keys';

/**
 * Ensures the structural `fields` block is present in the editor "blueprint" YAML, and normalizes
 * the top-level key order (case defaults in render-panel order, with custom `fields` appended last).
 * Run ONCE when seeding the initial editor value (not on every keystroke).
 *
 * Case defaults (name/description/severity/category/tags/assignees) are all optional and are NOT
 * seeded: an author adds only what their workflow needs, and the render panel shows sensible
 * fallbacks for anything left unset. The `connector` and `settings` blocks are likewise not seeded —
 * under the Fields/Configuration split they are panel-owned (edited on the Configuration tab, merged
 * into the saved definition on save), never part of the editor buffer. Template identity is never
 * written here either — it lives on the template's saved-object attributes.
 */
export const seedRequiredTemplateBlocks = (definitionYaml: string): string => {
  try {
    const doc = parseDocument(definitionYaml ?? '');
    if (!isMap(doc.contents)) {
      return definitionYaml;
    }

    const root = doc.contents as YAMLMap<unknown, unknown>;
    let modified = false;
    const ensure = (key: string, node: unknown) => {
      if (!root.has(key)) {
        root.set(key, node);
        modified = true;
      }
    };

    // Only the structural `fields` block is seeded; every case default is optional and left to the
    // author (the render panel supplies fallbacks for anything unset).
    ensure('fields', doc.createNode([]));

    // Order the case defaults to match the render panel and append `fields` last.
    modified = reorderTemplateDefinitionKeys(doc) || modified;

    // Preserve the author's exact formatting/comments when nothing was missing.
    return modified ? doc.toString() : definitionYaml;
  } catch {
    return definitionYaml;
  }
};
