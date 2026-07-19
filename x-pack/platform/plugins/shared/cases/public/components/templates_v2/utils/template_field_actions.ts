/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument, isMap, isSeq } from 'yaml';
import type { YAMLMap, YAMLSeq } from 'yaml';
import { FIELD_DEFAULT_SNIPPETS } from './template_field_snippets';
import { createOffsetToPosition, getEffectiveFieldName } from './template_yaml_ast';

/**
 * Pure YAML transforms that back the editor's Actions menu. Everything here operates on the YAML
 * string (via the `yaml` document model, so comments and existing formatting are preserved) and is
 * Monaco-free, so it can be unit tested without an editor. The Actions menu component wires the
 * editor cursor + `onChange` around these.
 *
 * The field shapes are NOT duplicated here — the "New field" scaffolds are derived from the single
 * source of truth `FIELD_DEFAULT_SNIPPETS` (also used by the editor's autocomplete), with the
 * `${n:placeholder}` tab-stop syntax stripped down to plain placeholder text.
 */

// Matches each `${n:placeholder}` tab-stop individually (non-greedy per token), so a string that
// embeds a placeholder among other text — or more than one — is reduced correctly rather than the
// whole string being treated as a single token.
const PLACEHOLDER_RE = /\$\{\d+:([^}]*)\}/g;

/**
 * Turns snippet tab-stop values (`${1:field_name}`) into their bare placeholder text (`field_name`).
 * Non-placeholder scalars, booleans, and numbers pass through unchanged; arrays/objects recurse.
 */
export const stripSnippetPlaceholders = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.replace(PLACEHOLDER_RE, '$1');
  }
  if (Array.isArray(value)) {
    return value.map(stripSnippetPlaceholders);
  }
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        stripSnippetPlaceholders(val),
      ])
    );
  }
  return value;
};

// control -> plain scaffold object, computed once from FIELD_DEFAULT_SNIPPETS. Only snippets that
// declare a `control` are field-type scaffolds (the `$ref` snippet is handled separately).
const SCAFFOLD_BY_CONTROL: Record<string, Record<string, unknown>> = (() => {
  const scaffolds: Record<string, Record<string, unknown>> = {};
  for (const snippet of FIELD_DEFAULT_SNIPPETS) {
    const body = snippet.body as Record<string, unknown>;
    if (typeof body.control === 'string') {
      scaffolds[body.control] = stripSnippetPlaceholders(body) as Record<string, unknown>;
    }
  }
  return scaffolds;
})();

/**
 * A fresh, ready-to-insert scaffold object for a field control (e.g. INPUT_TEXT), or `null` for an
 * unknown control. A deep clone is returned so callers can safely mutate (e.g. uniquify the name).
 */
export const buildFieldScaffold = (control: string): Record<string, unknown> | null => {
  const scaffold = SCAFFOLD_BY_CONTROL[control];
  return scaffold ? (JSON.parse(JSON.stringify(scaffold)) as Record<string, unknown>) : null;
};

const scalarString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

interface FieldEntryLocation {
  index: number;
  /** 1-based line of the entry's first content line. */
  startLine: number;
  /** 1-based line of the entry's last content line. */
  endLine: number;
  control?: string;
  /** Effective, unique-within-template name (`name`, or `$ref` when unnamed). */
  name?: string;
}

interface FieldsShape {
  seq: YAMLSeq | null;
  entries: FieldEntryLocation[];
}

// Resolves the `fields` sequence and the line span + identity of each entry, so cursor-position
// lookups don't need Monaco. `range[1]` is exclusive (often the start of the next line), so the last
// content character (`range[1] - 1`) is used to avoid an entry "owning" the following entry's line.
const getFieldsShape = (doc: ReturnType<typeof parseDocument>, source: string): FieldsShape => {
  const root = doc.contents;
  if (!isMap(root)) {
    return { seq: null, entries: [] };
  }
  const fieldsNode = root.get('fields', true);
  if (!isSeq(fieldsNode)) {
    return { seq: null, entries: [] };
  }

  const toPosition = createOffsetToPosition(source);
  const entries: FieldEntryLocation[] = fieldsNode.items.map((item, index) => {
    if (!isMap(item)) {
      return { index, startLine: 0, endLine: 0 };
    }
    const range = (item as YAMLMap).range;
    const startLine = range ? toPosition(range[0]).lineNumber : 0;
    const endLine = range ? toPosition(Math.max(range[0], range[1] - 1)).lineNumber : startLine;
    return {
      index,
      startLine,
      endLine,
      control: scalarString(item.get('control')),
      name: getEffectiveFieldName(item),
    };
  });

  return { seq: fieldsNode, entries };
};

const findEntryAtLine = (
  entries: FieldEntryLocation[],
  line: number | undefined
): FieldEntryLocation | undefined => {
  if (line == null) {
    return undefined;
  }
  return entries.find((entry) => line >= entry.startLine && line <= entry.endLine);
};

/**
 * The inline field entry (one with a `control`) the cursor sits on, or `null`. Drives whether the
 * Validation / Conditional-logic menu branches are enabled and which rules they offer.
 */
export const getFieldControlAtLine = (
  yaml: string,
  line: number | undefined
): { control: string; name?: string } | null => {
  if (!yaml || yaml.trim() === '') {
    return null;
  }
  let doc: ReturnType<typeof parseDocument>;
  try {
    doc = parseDocument(yaml);
  } catch {
    return null;
  }
  // An error-bearing (but parseable) buffer must not resolve a cursor field — the menu branches that
  // would mutate it are disabled instead (see hasTemplateParseErrors).
  if (doc.errors.length > 0) {
    return null;
  }
  const { entries } = getFieldsShape(doc, yaml);
  const entry = findEntryAtLine(entries, line);
  if (!entry || entry.control == null) {
    return null;
  }
  return { control: entry.control, name: entry.name };
};

/**
 * True when the buffer parses but carries YAML errors (e.g. a tab used for indentation, an unclosed
 * flow collection). `doc.toString()` throws on such a document, so the mutation helpers below no-op
 * on it and the menu disables its mutating branches rather than silently failing. Empty buffers are
 * NOT errors — they are a valid starting point for the first inserted field.
 */
export const hasTemplateParseErrors = (yaml: string): boolean => {
  if (!yaml || yaml.trim() === '') {
    return false;
  }
  try {
    return parseDocument(yaml).errors.length > 0;
  } catch {
    return true;
  }
};

export interface InsertFieldResult {
  yaml: string;
  changed: boolean;
  /** Why an insert did not apply, when `changed` is false. */
  reason?: 'exists' | 'invalid';
  /** The effective name of the inserted entry (after uniquification), for cursor placement. */
  insertedName?: string;
}

/**
 * Inserts a field entry (an inline scaffold or a `{ $ref }` reference) into the template's `fields`
 * list. When the cursor sits inside an existing field entry the new entry is placed directly after
 * it; otherwise it is appended to the end of `fields` (everything above `fields` is case data). A
 * missing `fields` block is created.
 *
 * Inline entries get a unique `name` (a numeric suffix is appended on collision) so a fresh insert
 * never immediately trips the duplicate-name validator. A `$ref` that is already linked is a no-op
 * (`changed: false`) — the caller surfaces that to the user rather than adding a duplicate.
 */
export const insertTemplateField = (
  yaml: string,
  fieldObject: Record<string, unknown>,
  cursorLine?: number
): InsertFieldResult => {
  const doc = parseDocument(yaml ?? '');
  // A parseable-but-error-bearing buffer can't be re-serialized (`doc.toString()` throws), so bail
  // with a distinct reason the caller turns into a "fix YAML errors first" toast.
  if (doc.errors.length > 0) {
    return { yaml, changed: false, reason: 'invalid' };
  }
  let root = doc.contents;

  // Empty / comment-only buffers parse to null contents — initialize a map so the field still lands.
  if (root == null) {
    doc.contents = doc.createNode({}) as typeof doc.contents;
    root = doc.contents;
  }
  if (!isMap(root)) {
    return { yaml, changed: false, reason: 'invalid' };
  }

  const { seq, entries } = getFieldsShape(doc, yaml ?? '');
  const existingNames = new Set(
    entries.map((entry) => entry.name).filter((name): name is string => Boolean(name))
  );

  const field = { ...fieldObject };
  const isRef = typeof field.$ref === 'string';

  if (isRef) {
    // A library reference is identified by its $ref name; adding it twice is a no-op.
    if (existingNames.has(field.$ref as string)) {
      return { yaml, changed: false, reason: 'exists' };
    }
  } else if (typeof field.name === 'string') {
    field.name = uniquifyName(field.name, existingNames);
  }

  const insertedName = isRef ? (field.$ref as string) : (field.name as string | undefined);
  const fieldNode = doc.createNode(field);

  if (seq) {
    const at = findEntryAtLine(entries, cursorLine);
    const insertIndex = at ? at.index + 1 : seq.items.length;
    // YAMLSeq exposes its items array; splicing preserves the other entries' nodes (and comments).
    seq.items.splice(insertIndex, 0, fieldNode);
  } else {
    // `setIn` accepts a string path (a parsed map's keys are node-typed, so `root.set('fields', …)`
    // does not type-check) — mirrors insert_field_from_library.ts.
    doc.setIn(['fields'], doc.createNode([field]));
  }

  return { yaml: doc.toString(), changed: true, insertedName };
};

const uniquifyName = (base: string, existing: ReadonlySet<string>): string => {
  if (!existing.has(base)) {
    return base;
  }
  let counter = 2;
  while (existing.has(`${base}_${counter}`)) {
    counter += 1;
  }
  return `${base}_${counter}`;
};

export type ApplyFieldBlockStatus = 'applied' | 'no-field' | 'exists' | 'invalid';

export interface ApplyFieldBlockResult {
  yaml: string;
  status: ApplyFieldBlockStatus;
  fieldName?: string;
}

/**
 * Adds a single rule under a field's `validation` or `display` block (creating the block if needed),
 * targeting the inline field the cursor is on. Returns:
 *  - `invalid`    — the buffer has YAML errors and can't be re-serialized; nothing changed.
 *  - `no-field`   — the cursor is not on an inline (control) field; nothing changed.
 *  - `exists`     — that rule key is already present; left untouched so authored values are never
 *                   clobbered.
 *  - `applied`    — the rule was added with the supplied scaffold value.
 */
export const applyFieldBlock = (
  yaml: string,
  cursorLine: number | undefined,
  blockKey: 'validation' | 'display',
  ruleKey: string,
  ruleValue: unknown
): ApplyFieldBlockResult => {
  const doc = parseDocument(yaml ?? '');
  if (doc.errors.length > 0) {
    return { yaml, status: 'invalid' };
  }
  const root = doc.contents;
  if (!isMap(root)) {
    return { yaml, status: 'no-field' };
  }

  const { seq, entries } = getFieldsShape(doc, yaml ?? '');
  const at = findEntryAtLine(entries, cursorLine);
  // Only inline fields (those with a `control`) accept validation / display blocks.
  if (!seq || !at || at.control == null) {
    return { yaml, status: 'no-field' };
  }

  const item = seq.items[at.index];
  if (!isMap(item)) {
    return { yaml, status: 'no-field' };
  }
  // A parsed map's key type is node-based; casting to `unknown` keys lets us set by string key.
  const itemMap = item as YAMLMap<unknown, unknown>;

  const existingBlock = itemMap.get(blockKey, true);
  let blockMap: YAMLMap<unknown, unknown>;
  if (isMap(existingBlock)) {
    blockMap = existingBlock as YAMLMap<unknown, unknown>;
  } else {
    blockMap = doc.createNode({}) as YAMLMap<unknown, unknown>;
    itemMap.set(blockKey, blockMap);
  }

  if (blockMap.has(ruleKey)) {
    return { yaml, status: 'exists', fieldName: at.name };
  }

  blockMap.set(ruleKey, doc.createNode(ruleValue));
  return { yaml: doc.toString(), status: 'applied', fieldName: at.name };
};
