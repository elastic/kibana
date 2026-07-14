/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YAMLMap } from 'yaml';
import { isMap, parseDocument } from 'yaml';

/**
 * Ensures every case-default key plus the `fields` block is present in the editor "blueprint" YAML,
 * so an author never mistakes an absent key for "this field won't be on the case". Run ONCE when
 * seeding the initial editor value (not on every keystroke) — removing a block afterwards surfaces
 * as a validation error rather than being silently re-added.
 *
 * The `connector` and `settings` blocks are intentionally NOT seeded here: under the Fields/
 * Configuration split they are panel-owned (edited on the Configuration tab, merged into the saved
 * definition on save), never part of the editor buffer. Template identity is likewise never written
 * here — it lives on the template's saved-object attributes.
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

    // `name` (the case-default title) requires a real value and is not seeded — a missing/empty name
    // is surfaced as a validation error instead.
    //
    // Severity is always applied to a case, so the blueprint always carries a concrete default
    // (`low`) — never `null`. `description`/`category` are genuinely optional and are simply omitted
    // when unset; no `null` placeholder is ever written into the editor YAML.
    ensure('severity', 'low');
    ensure('tags', doc.createNode([]));
    ensure('assignees', doc.createNode([]));
    ensure('fields', doc.createNode([]));

    // Preserve the author's exact formatting/comments when nothing was missing.
    return modified ? doc.toString() : definitionYaml;
  } catch {
    return definitionYaml;
  }
};
