/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import type { SchemasSettings } from 'monaco-yaml';
import { templateYamlLanguageService } from '../utils/template_yaml_language_service';

interface TemplateYamlEditorBaseProps {
  value: string;
  onChange: (value: string) => void;
  schemas: Array<{
    uri: string;
    fileMatch: string[];
    schema: unknown;
  }>;
}

export const TemplateYamlEditorBase: React.FC<TemplateYamlEditorBaseProps> = ({
  value,
  onChange,
  schemas,
}) => {
  useEffect(() => {
    templateYamlLanguageService.update(schemas as SchemasSettings[]);
  }, [schemas]);

  useEffect(() => {
    return () => {
      templateYamlLanguageService.clearSchemas();
    };
  }, []);

  return (
    <CodeEditor
      languageId="yaml"
      value={value}
      onChange={onChange}
      width="100%"
      height="100%"
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
