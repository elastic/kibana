/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { monaco } from '@kbn/monaco';
import type { EditorMarker } from '../utils/template_yaml_ast';
import { getMissingConditionFieldMarkers } from '../utils/validate_condition_field_references';
import { getInapplicableValidationRuleMarkers } from '../utils/validate_field_validation_rules';

const SEMANTIC_VALIDATION_OWNER = 'template-semantic-validation';

const toMonacoSeverity = (severity: EditorMarker['severity']): monaco.MarkerSeverity =>
  severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning;

/**
 * Registers editor markers for the semantic checks that a JSON Schema cannot express: conditions
 * that reference a non-existent field, and validation rules applied to a control type they do not
 * affect. Both are documented gotchas that otherwise fail silently. Debounced like the sibling
 * field-name/user-picker validators so it does not run on every keystroke, and scoped to its own
 * marker owner so it never clobbers monaco-yaml's diagnostics.
 */
export const useSemanticValidation = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  value: string
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (model.isDisposed()) {
        return;
      }
      try {
        const markers: EditorMarker[] = [
          ...getMissingConditionFieldMarkers(value),
          ...getInapplicableValidationRuleMarkers(value),
        ];
        monaco.editor.setModelMarkers(
          model,
          SEMANTIC_VALIDATION_OWNER,
          markers.map((marker) => ({
            startLineNumber: marker.startLineNumber,
            startColumn: marker.startColumn,
            endLineNumber: marker.endLineNumber,
            endColumn: marker.endColumn,
            message: marker.message,
            severity: toMonacoSeverity(marker.severity),
            source: SEMANTIC_VALIDATION_OWNER,
          }))
        );
      } catch {
        monaco.editor.setModelMarkers(model, SEMANTIC_VALIDATION_OWNER, []);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editor, value]);
};
