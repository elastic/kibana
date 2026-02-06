/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CodeEditor } from '@kbn/code-editor';

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  isReadOnly?: boolean;
}

export const QueryEditor: React.FC<QueryEditorProps> = ({
  value,
  onChange,
  onBlur,
  isReadOnly = false,
}) => {
  return (
    <CodeEditor
      languageId="esql"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={{
        readOnly: isReadOnly,
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        lineNumbers: 'on',
        automaticLayout: true,
      }}
      height="200px"
    />
  );
};
