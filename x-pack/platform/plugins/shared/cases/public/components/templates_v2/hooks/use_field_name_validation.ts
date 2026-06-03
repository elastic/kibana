/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { parse } from 'yaml';
import { monaco } from '@kbn/monaco';

interface FieldNameInfo {
  name: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

const FIELD_NAME_VALIDATION_OWNER = 'field-name-validation';

export const useFieldNameValidation = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  value: string
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
      validateFieldNames(model, value);
    }, 300);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [editor, value]);
};

function validateFieldNames(model: monaco.editor.ITextModel, yamlContent: string) {
  try {
    const parsed = parse(yamlContent);
    const fields = parsed?.fields;

    if (!Array.isArray(fields)) {
      monaco.editor.setModelMarkers(model, FIELD_NAME_VALIDATION_OWNER, []);
      return;
    }

    const fieldInfos = collectFieldNames(yamlContent, fields);
    const markers = createDuplicateFieldMarkers(fieldInfos);

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
