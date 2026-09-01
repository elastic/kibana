/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { parse } from 'yaml';
import { monaco } from '@kbn/monaco';
import {
  getAuthorableFieldNameViolation,
  getFoldedFieldName,
} from '../../../../common/utils/template_fields';
import {
  charsetNameMessage,
  nameTooLongMessage,
  foldedNameCollisionMessage,
} from '../../../../common/types/domain/template/strict_fields';
import { getExistingFieldNames } from '../utils/validate_template_definition';

interface FieldNameInfo {
  name: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

const FIELD_NAME_VALIDATION_OWNER = 'field-name-validation';

/**
 * `existingDefinition` — the template's currently-stored definition when editing an existing
 * template (undefined when creating) — grandfathers field names that predate the
 * authoring-charset rule, so an untouched legacy field doesn't show a squiggle (and, via
 * `validateTemplateDefinitionYaml`, doesn't disable Save) on every edit. Mirrors the server-side
 * grandfathering in `TemplatesService.updateTemplate`.
 */
export const useFieldNameValidation = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  value: string,
  existingDefinition?: string
) => {
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      validateFieldNames(model, value, existingDefinition);
    }, 300);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [editor, value, existingDefinition]);
};

function validateFieldNames(
  model: monaco.editor.ITextModel,
  yamlContent: string,
  existingDefinition?: string
) {
  try {
    const parsed = parse(yamlContent);
    const fields = parsed?.fields;

    if (!Array.isArray(fields)) {
      monaco.editor.setModelMarkers(model, FIELD_NAME_VALIDATION_OWNER, []);
      return;
    }

    const fieldInfos = collectFieldNames(yamlContent, fields);
    const grandfatheredNames =
      existingDefinition !== undefined ? getExistingFieldNames(existingDefinition) : undefined;
    const markers = [
      ...createDuplicateFieldMarkers(fieldInfos),
      ...createInvalidNameMarkers(fieldInfos, fields, grandfatheredNames),
    ];

    monaco.editor.setModelMarkers(model, FIELD_NAME_VALIDATION_OWNER, markers);
  } catch (error) {
    monaco.editor.setModelMarkers(model, FIELD_NAME_VALIDATION_OWNER, []);
  }
}

export function collectFieldNames(yamlContent: string, fields: unknown[]): FieldNameInfo[] {
  const fieldInfos: FieldNameInfo[] = [];
  const lines = yamlContent.split('\n');
  const nameOccurrences: Array<{ name: string; line: number; column: number }> = [];

  let inFieldsArray = false;
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const line = lines[lineNumber];

    if (line.match(/^\s*fields:\s*$/)) {
      inFieldsArray = true;
    } else if (inFieldsArray && line.match(/^\s*-?\s*name:\s*/)) {
      const nameMatch = line.match(/name:\s*(.+?)$/);
      if (nameMatch) {
        const rawValue = nameMatch[1].trim();
        const extractedName = rawValue.replace(/^['"]|['"]$/g, '');
        const colonIndex = line.indexOf('name:');
        const valueStart = line.indexOf(extractedName, colonIndex);
        if (valueStart !== -1) {
          nameOccurrences.push({
            name: extractedName,
            line: lineNumber,
            column: valueStart,
          });
        }
      }
    } else if (inFieldsArray && line.match(/^\S/) && !line.match(/^\s*-/)) {
      break;
    }
  }

  for (let i = 0; i < fields.length && i < nameOccurrences.length; i++) {
    const field = fields[i];
    if (typeof field === 'object' && field !== null && 'name' in field) {
      const fieldName = (field as { name: unknown }).name;
      if (typeof fieldName === 'string') {
        const occurrence = nameOccurrences[i];
        if (occurrence && occurrence.name === fieldName) {
          fieldInfos.push({
            name: fieldName,
            startLineNumber: occurrence.line + 1,
            startColumn: occurrence.column + 1,
            endLineNumber: occurrence.line + 1,
            endColumn: occurrence.column + fieldName.length + 1,
          });
        }
      }
    }
  }

  return fieldInfos;
}

/**
 * Places a Monaco error marker on every field name that fails the authoring rules — charset
 * (`AUTHORABLE_SNAKE_KEY`), derived-key length, or a camelCase-folded collision with a name in
 * `grandfatheredNames` — using the same message builders as the strict write schema so the
 * squiggle text matches the Save-gate footer and the server error. A name that byte-exactly
 * matches an entry in `grandfatheredNames` (already present in the currently-stored definition
 * — see `getExistingFieldNames`) is left unmarked, so editing a template that predates the
 * rules doesn't show a permanent squiggle.
 * Runs alongside `createDuplicateFieldMarkers` so the editor shows inline squiggles before Save.
 */
export function createInvalidNameMarkers(
  fieldInfos: FieldNameInfo[],
  rawFields: unknown[],
  grandfatheredNames?: ReadonlySet<string>
): monaco.editor.IMarkerData[] {
  const markers: monaco.editor.IMarkerData[] = [];
  const foldedNameIndex = new Map<string, string>();
  for (const name of grandfatheredNames ?? []) {
    foldedNameIndex.set(getFoldedFieldName(name), name);
  }

  for (let i = 0; i < fieldInfos.length; i++) {
    const info = fieldInfos[i];
    const rawField = rawFields[i];

    if (info && !grandfatheredNames?.has(info.name)) {
      const type =
        typeof rawField === 'object' && rawField !== null && 'type' in rawField
          ? (rawField as { type: unknown }).type
          : undefined;

      // Only inline (non-$ref) fields have a type; $ref aliases are rare in the template editor
      // and are validated by the strict schema on save, so we skip them here.
      if (typeof type === 'string') {
        const message = getInvalidNameMessage(info.name, type, foldedNameIndex);
        if (message !== undefined) {
          markers.push({
            startLineNumber: info.startLineNumber,
            startColumn: info.startColumn,
            endLineNumber: info.endLineNumber,
            endColumn: info.endColumn,
            severity: 8, // Error
            message,
            source: FIELD_NAME_VALIDATION_OWNER,
          });
        }
      }
    }
  }

  return markers;
}

/**
 * The marker message for a name, or `undefined` when the name is fine. Mirrors the precedence
 * in the strict schema's `assertAuthorableName`: charset/length first, then the folded-twin
 * check (only reachable for names that are not byte-exactly grandfathered — the caller skips
 * those before getting here).
 */
function getInvalidNameMessage(
  name: string,
  type: string,
  foldedNameIndex: ReadonlyMap<string, string>
): string | undefined {
  const violation = getAuthorableFieldNameViolation(name, type);
  if (violation === 'length') return nameTooLongMessage(name);
  if (violation === 'charset') return charsetNameMessage(name);

  const collidingName = foldedNameIndex.get(getFoldedFieldName(name));
  return collidingName !== undefined ? foldedNameCollisionMessage(name, collidingName) : undefined;
}

export function createDuplicateFieldMarkers(
  fieldInfos: FieldNameInfo[]
): monaco.editor.IMarkerData[] {
  const markers: monaco.editor.IMarkerData[] = [];
  const fieldNameCounts = new Map<string, FieldNameInfo[]>();

  for (const fieldInfo of fieldInfos) {
    const existing = fieldNameCounts.get(fieldInfo.name);
    if (existing) {
      existing.push(fieldInfo);
    } else {
      fieldNameCounts.set(fieldInfo.name, [fieldInfo]);
    }
  }

  for (const [fieldName, occurrences] of fieldNameCounts) {
    if (occurrences.length > 1) {
      for (const occurrence of occurrences) {
        markers.push({
          startLineNumber: occurrence.startLineNumber,
          startColumn: occurrence.startColumn,
          endLineNumber: occurrence.endLineNumber,
          endColumn: occurrence.endColumn,
          severity: 8,
          message: `Field name "${fieldName}" is not unique. Found ${occurrences.length} fields with this name.`,
          source: FIELD_NAME_VALIDATION_OWNER,
        });
      }
    }
  }

  return markers;
}
