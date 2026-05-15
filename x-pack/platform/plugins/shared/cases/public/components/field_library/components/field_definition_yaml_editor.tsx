/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { TemplateYamlEditorBase } from '../../templates_v2/components/template_yaml_editor';
import {
  getFieldDefinitionJsonSchema,
  FIELD_DEFINITION_SCHEMA_URI,
} from '../utils/field_definition_json_schema';

interface FieldDefinitionYamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

const containerCss = (height: number) =>
  css({
    height: `${height}px`,
    width: '100%',
  });

export const FieldDefinitionYamlEditor: React.FC<FieldDefinitionYamlEditorProps> = ({
  value,
  onChange,
  height = 300,
}) => {
  const schemas = useMemo(() => {
    const jsonSchema = getFieldDefinitionJsonSchema();
    if (!jsonSchema) return [];
    return [{ uri: FIELD_DEFINITION_SCHEMA_URI, fileMatch: ['*'], schema: jsonSchema }];
  }, []);

  return (
    <div css={containerCss(height)}>
      <TemplateYamlEditorBase value={value} onChange={onChange} schemas={schemas} />
    </div>
  );
};

FieldDefinitionYamlEditor.displayName = 'FieldDefinitionYamlEditor';
