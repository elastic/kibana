/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { monaco } from '@kbn/monaco';
import { TemplateYamlEditorBase } from '../../templates_v2/components/template_yaml_editor';
import { TemplateActionsMenu } from '../../templates_v2/components/template_actions_menu';
import {
  getFieldDefinitionJsonSchema,
  FIELD_DEFINITION_SCHEMA_URI,
} from '../utils/field_definition_json_schema';

interface FieldDefinitionYamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  'data-test-subj'?: string;
}

// Relative positioning anchors the actions menu's floating trigger to the editor box.
const containerCss = (height: number) =>
  css({
    height: `${height}px`,
    width: '100%',
    position: 'relative',
  });

export const FieldDefinitionYamlEditor: React.FC<FieldDefinitionYamlEditorProps> = ({
  value,
  onChange,
  height = 300,
  'data-test-subj': dataTestSubj,
}) => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  const schemas = useMemo(() => {
    const jsonSchema = getFieldDefinitionJsonSchema();
    if (!jsonSchema) return [];
    return [{ uri: FIELD_DEFINITION_SCHEMA_URI, fileMatch: ['*'], schema: jsonSchema }];
  }, []);

  const handleEditorMount = useCallback(
    (isMounted: boolean, mountedEditor?: monaco.editor.IStandaloneCodeEditor) => {
      setEditor(isMounted && mountedEditor ? mountedEditor : null);
    },
    []
  );

  return (
    <div css={containerCss(height)} data-test-subj={dataTestSubj}>
      <TemplateYamlEditorBase
        value={value}
        onChange={onChange}
        schemas={schemas}
        onEditorMount={handleEditorMount}
      />
      {editor ? (
        <TemplateActionsMenu
          editor={editor}
          value={value}
          onChange={onChange}
          mode="fieldDefinition"
        />
      ) : null}
    </div>
  );
};

FieldDefinitionYamlEditor.displayName = 'FieldDefinitionYamlEditor';
