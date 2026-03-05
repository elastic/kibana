/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { monaco } from '@kbn/monaco';
import type { SchemasSettings } from 'monaco-yaml';
import { templateYamlLanguageService } from '../utils/template_yaml_language_service';
import type { ValidationError } from './template_yaml_validation_accordion';

interface TemplateYamlEditorBaseProps {
  value: string;
  onChange: (value: string) => void;
  schemas: Array<{
    uri: string;
    fileMatch: string[];
    schema: unknown;
  }>;
  onValidationChange?: (errors: ValidationError[]) => void;
  onEditorMount?: (isMounted: boolean, editor?: monaco.editor.IStandaloneCodeEditor) => void;
}

export const TemplateYamlEditorBase: React.FC<TemplateYamlEditorBaseProps> = ({
  value,
  onChange,
  schemas,
  onValidationChange,
  onEditorMount,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const markersSubscriptionRef = useRef<monaco.IDisposable | null>(null);

  useEffect(() => {
    templateYamlLanguageService.update(schemas as SchemasSettings[]);
  }, [schemas]);

  useEffect(() => {
    return () => {
      templateYamlLanguageService.clearSchemas();
      markersSubscriptionRef.current?.dispose();
    };
  }, []);

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      onEditorMount?.(true, editor);

      markersSubscriptionRef.current?.dispose();
      markersSubscriptionRef.current = monaco.editor.onDidChangeMarkers(() => {
        const model = editor.getModel();
        if (!model || model.isDisposed()) {
          return;
        }

        const markers = monaco.editor.getModelMarkers({
          resource: model.uri,
        });

        const validationErrors: ValidationError[] = markers
          .filter((marker) => marker.severity >= monaco.MarkerSeverity.Warning)
          .map((marker) => ({
            message: marker.message,
            severity: marker.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning',
            startLineNumber: marker.startLineNumber,
            startColumn: marker.startColumn,
            endLineNumber: marker.endLineNumber,
            endColumn: marker.endColumn,
          }));

        onValidationChange?.(validationErrors);
      });

      const model = editor.getModel();
      if (model) {
        const markers = monaco.editor.getModelMarkers({
          resource: model.uri,
        });
        const validationErrors: ValidationError[] = markers
          .filter((marker) => marker.severity >= monaco.MarkerSeverity.Warning)
          .map((marker) => ({
            message: marker.message,
            severity: marker.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning',
            startLineNumber: marker.startLineNumber,
            startColumn: marker.startColumn,
            endLineNumber: marker.endLineNumber,
            endColumn: marker.endColumn,
          }));
        onValidationChange?.(validationErrors);
      }
    },
    [onValidationChange, onEditorMount]
  );

  return (
    <CodeEditor
      languageId="yaml"
      value={value}
      onChange={onChange}
      width="100%"
      height="100%"
      editorDidMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        lineNumbers: 'on',
        glyphMargin: true,
        tabSize: 2,
        lineNumbersMinChars: 2,
        insertSpaces: true,
        fontSize: 14,
        renderWhitespace: 'all',
        wordWrapColumn: 80,
        wrappingIndent: 'indent',
        formatOnType: true,
      }}
    />
  );
};

TemplateYamlEditorBase.displayName = 'TemplateYamlEditorBase';
