/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { monaco } from '@kbn/monaco';
import type { ValidationError } from '../components/template_yaml_validation_accordion';

interface UseValidationAccordionPositioningReturn {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  validationErrors: ValidationError[];
  isEditorMounted: boolean;
  handleValidationChange: (errors: ValidationError[]) => void;
  handleEditorMount: (isMounted: boolean, editor?: monaco.editor.IStandaloneCodeEditor) => void;
  handleErrorClick: (error: ValidationError) => void;
}

/**
 * Wires the YAML editor to its validation accordion: tracks the Monaco instance,
 * the current validation errors, and click-to-line navigation. The accordion is
 * rendered inline (in normal flow) beneath the editor, so no manual positioning is
 * required — it tracks the panel width via the layout, not JavaScript.
 */
export const useValidationAccordionPositioning = (): UseValidationAccordionPositioningReturn => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  const handleValidationChange = useCallback((errors: ValidationError[]) => {
    setValidationErrors(errors);
  }, []);

  const handleEditorMount = useCallback(
    (isMounted: boolean, editor?: monaco.editor.IStandaloneCodeEditor) => {
      setIsEditorMounted(isMounted);
      if (editor) {
        editorRef.current = editor;
      }
    },
    []
  );

  const handleErrorClick = useCallback((error: ValidationError) => {
    if (editorRef.current) {
      editorRef.current.setPosition({
        lineNumber: error.startLineNumber,
        column: error.startColumn,
      });
      editorRef.current.revealLineInCenter(error.startLineNumber);
      editorRef.current.focus();
    }
  }, []);

  return {
    editorRef,
    validationErrors,
    isEditorMounted,
    handleValidationChange,
    handleEditorMount,
    handleErrorClick,
  };
};
