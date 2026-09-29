/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument, isMap } from 'yaml';
import type { YAMLMap } from 'yaml';

/**
 * Pure YAML transforms for documents whose root IS a single inline field — the field library's
 * definition shape — backing the Actions menu in `fieldDefinition` mode. These are the root-document
 * counterparts of the `fields[]`-sequence transforms in template_field_actions.ts: there is no
 * sequence to splice into, no cursor-line entry lookup, and no sibling names to uniquify against, so
 * the traversal is intentionally not shared (only the shape-agnostic helpers — scaffold building and
 * parse-error detection — are reused from template_field_actions.ts by the menu component).
 */

const scalarString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/**
 * The document root's inline field (one with a `control`), or `null` when the buffer is empty, the
 * root is not a map, or the map has no `control`. Error-bearing buffers also resolve to `null` — the
 * menu branches that would mutate them are disabled instead (see hasTemplateParseErrors).
 */
export const getRootFieldControl = (yaml: string): { control: string; name?: string } | null => {
  if (!yaml || yaml.trim() === '') {
    return null;
  }
  let doc: ReturnType<typeof parseDocument>;
  try {
    doc = parseDocument(yaml);
  } catch {
    return null;
  }
  if (doc.errors.length > 0) {
    return null;
  }
  const root = doc.contents;
  if (!isMap(root)) {
    return null;
  }
  const control = scalarString(root.get('control'));
  if (control == null) {
    return null;
  }
  return { control, name: scalarString(root.get('name')) };
};

export interface ReplaceRootFieldResult {
  yaml: string;
  /** Why the replace did not apply, when the yaml is returned unchanged. */
  status: 'applied' | 'invalid';
}

/**
 * Replaces the entire document root with a fresh field scaffold. Whether this creates the first
 * field or changes an existing field's type is purely a labeling distinction in the menu — the
 * operation is the same whole-root swap, and nothing from the prior definition survives (so a stale
 * `default`/`validation` of the wrong shape can never outlive a type change).
 */
export const replaceRootField = (
  yaml: string,
  fieldObject: Record<string, unknown>
): ReplaceRootFieldResult => {
  const doc = parseDocument(yaml ?? '');
  // A parseable-but-error-bearing buffer can't be re-serialized (`doc.toString()` throws), so bail
  // with a status the caller turns into a "fix YAML errors first" toast.
  if (doc.errors.length > 0) {
    return { yaml, status: 'invalid' };
  }
  doc.contents = doc.createNode(fieldObject) as typeof doc.contents;
  return { yaml: doc.toString(), status: 'applied' };
};

export type ApplyRootFieldBlockStatus = 'applied' | 'no-field' | 'exists' | 'invalid';

export interface ApplyRootFieldBlockResult {
  yaml: string;
  status: ApplyRootFieldBlockStatus;
}

/**
 * Adds a single rule under the root field's `validation` or `display` block (creating the block if
 * needed). Mirrors applyFieldBlock's contract minus the cursor targeting. Returns:
 *  - `invalid`  — the buffer has YAML errors and can't be re-serialized; nothing changed.
 *  - `no-field` — the root is not an inline (control) field; nothing changed.
 *  - `exists`   — that rule key is already present; left untouched so authored values are never
 *                 clobbered.
 *  - `applied`  — the rule was added with the supplied scaffold value.
 */
export const applyRootFieldBlock = (
  yaml: string,
  blockKey: 'validation' | 'display',
  ruleKey: string,
  ruleValue: unknown
): ApplyRootFieldBlockResult => {
  const doc = parseDocument(yaml ?? '');
  if (doc.errors.length > 0) {
    return { yaml, status: 'invalid' };
  }
  const root = doc.contents;
  // Only inline fields (those with a `control`) accept validation / display blocks.
  if (!isMap(root) || scalarString(root.get('control')) == null) {
    return { yaml, status: 'no-field' };
  }
  // A parsed map's key type is node-based; casting to `unknown` keys lets us set by string key.
  const rootMap = root as YAMLMap<unknown, unknown>;

  const existingBlock = rootMap.get(blockKey, true);
  let blockMap: YAMLMap<unknown, unknown>;
  if (isMap(existingBlock)) {
    blockMap = existingBlock as YAMLMap<unknown, unknown>;
  } else {
    blockMap = doc.createNode({}) as YAMLMap<unknown, unknown>;
    rootMap.set(blockKey, blockMap);
  }

  if (blockMap.has(ruleKey)) {
    return { yaml, status: 'exists' };
  }

  blockMap.set(ruleKey, doc.createNode(ruleValue));
  return { yaml: doc.toString(), status: 'applied' };
};
