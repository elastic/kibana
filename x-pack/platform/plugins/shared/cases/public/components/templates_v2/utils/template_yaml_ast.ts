/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document, Node, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import { parseDocument, isMap, isSeq } from 'yaml';

/**
 * A validation marker in Monaco's 1-based line/column coordinate space, kept free of any Monaco
 * types so the semantic validators can be unit tested without the editor. The consuming hook maps
 * `severity` onto `monaco.MarkerSeverity`.
 */
export interface EditorMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Parses the template YAML into a document whose root is a mapping, or returns `null` when the
 * content is empty, malformed, or not a top-level object. Semantic validators bail out on `null`
 * so they never fight monaco-yaml's own syntax/schema diagnostics on broken YAML.
 */
export const parseTemplateDocument = (yamlContent: string): Document.Parsed | null => {
  if (!yamlContent || yamlContent.trim() === '') {
    return null;
  }

  let doc: Document.Parsed;
  try {
    doc = parseDocument(yamlContent);
  } catch {
    return null;
  }

  if (doc.errors.length > 0 || !isMap(doc.contents)) {
    return null;
  }

  return doc;
};

/** Returns the `fields` sequence entries as mapping nodes, or an empty array when absent. */
export const getFieldItemMaps = (doc: Document.Parsed): YAMLMap[] => {
  const root = doc.contents;
  if (!isMap(root)) {
    return [];
  }

  const fieldsNode = root.get('fields', true) as unknown;
  if (!isSeq(fieldsNode)) {
    return [];
  }

  return (fieldsNode as YAMLSeq).items.filter(isMap) as YAMLMap[];
};

const scalarString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/**
 * The effective, unique-within-template name of a field entry: for a `$ref` it is the local
 * `name` alias when present, otherwise the referenced library name; for an inline field it is
 * `name`. Mirrors `getEffectiveName` in the field-library link utilities.
 */
export const getEffectiveFieldName = (field: YAMLMap): string | undefined => {
  const name = scalarString(field.get('name'));
  const ref = scalarString(field.get('$ref'));
  if (ref !== undefined) {
    return name ?? ref;
  }
  return name;
};

/** The set of every effective field name declared in the template's `fields` list. */
export const getDefinedFieldNames = (fieldItems: YAMLMap[]): Set<string> => {
  const names = new Set<string>();
  for (const field of fieldItems) {
    const effectiveName = getEffectiveFieldName(field);
    if (effectiveName !== undefined && effectiveName !== '') {
      names.add(effectiveName);
    }
  }
  return names;
};

/**
 * Builds a fast offset → 1-based {lineNumber, column} resolver for a source string, precomputing
 * line-start offsets once so each lookup is a binary search.
 */
export const createOffsetToPosition = (source: string) => {
  const lineStartOffsets: number[] = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') {
      lineStartOffsets.push(i + 1);
    }
  }

  return (offset: number): { lineNumber: number; column: number } => {
    let low = 0;
    let high = lineStartOffsets.length - 1;
    let line = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStartOffsets[mid] <= offset) {
        line = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return { lineNumber: line + 1, column: offset - lineStartOffsets[line] + 1 };
  };
};

/**
 * Converts a YAML node's source range into a Monaco marker rectangle using the supplied resolver,
 * or `null` when the node carries no range (e.g. a node created in memory).
 */
export const nodeRangeToMarkerPosition = (
  node: Node | Scalar,
  toPosition: ReturnType<typeof createOffsetToPosition>
): Pick<EditorMarker, 'startLineNumber' | 'startColumn' | 'endLineNumber' | 'endColumn'> | null => {
  const { range } = node as { range?: [number, number, number] | null };
  if (!range) {
    return null;
  }
  const start = toPosition(range[0]);
  const end = toPosition(range[1]);
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
};
