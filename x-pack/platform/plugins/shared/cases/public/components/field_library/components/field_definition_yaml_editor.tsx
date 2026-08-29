/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiPanel } from '@elastic/eui';
import { parse as parseYaml } from 'yaml';
import { InlineFieldSchema } from '../../../../common/types/domain/template/fields';
import { StrictInlineFieldSchema } from '../../../../common/types/domain/template/strict_fields';
import { TemplateYamlEditorBase } from '../../templates_v2/components/template_yaml_editor';
import { TemplateActionsMenu } from '../../templates_v2/components/template_actions_menu';
import {
  type ValidationError,
  TemplateYamlValidationAccordion,
} from '../../templates_v2/components/template_yaml_validation_accordion';
import { useValidationAccordionPositioning } from '../../templates_v2/hooks/use_validation_accordion_positioning';
import {
  getFieldDefinitionJsonSchema,
  FIELD_DEFINITION_SCHEMA_URI,
} from '../utils/field_definition_json_schema';
import * as i18n from '../translations';

interface FieldDefinitionYamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * When editing an existing definition the name is immutable and the server validates with
   * the lenient schema, so a stored name that predates the authoring-charset rule (e.g. one
   * with hyphens) must not surface a charset error here. Mirrors the flyout's Save gate.
   */
  isEditing?: boolean;
  height?: number;
  'data-test-subj'?: string;
}

const containerCss = (height: number) =>
  css({
    height: `${height}px`,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  });

// Relative positioning anchors the actions menu's floating trigger to the editor box.
const editorContainerCss = css({
  flex: '1 1 0',
  minHeight: 0,
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
});

const validationFooterCss = css({
  flexShrink: 0,
  overflow: 'hidden',
});

const getDefinitionValidationErrors = (value: string, isEditing: boolean): ValidationError[] => {
  try {
    // Strict (authoring charset) on create; lenient on edit, where the name is immutable and
    // may legitimately predate the charset rule — matching what the server will accept.
    const schema = isEditing ? InlineFieldSchema : StrictInlineFieldSchema;
    const result = schema.safeParse(parseYaml(value));
    if (result.success) return [];

    // Surface the first issue's message so the author sees which character is invalid,
    // rather than the blanket "invalid field definition YAML" fallback.
    const message = result.error.issues[0]?.message ?? i18n.FIELD_DEFINITION_YAML_INVALID;
    return [
      {
        message,
        severity: 'error',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      },
    ];
  } catch {
    return [
      {
        message: i18n.FIELD_DEFINITION_YAML_INVALID_SYNTAX,
        severity: 'error',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      },
    ];
  }
};

export const FieldDefinitionYamlEditor: React.FC<FieldDefinitionYamlEditorProps> = ({
  value,
  onChange,
  isEditing = false,
  height = 300,
  'data-test-subj': dataTestSubj,
}) => {
  const {
    editorRef,
    validationErrors,
    isEditorMounted,
    handleValidationChange,
    handleEditorMount,
    handleErrorClick,
  } = useValidationAccordionPositioning();

  const definitionValidationErrors = useMemo(
    () => getDefinitionValidationErrors(value, isEditing),
    [value, isEditing]
  );
  const allValidationErrors = useMemo(
    () =>
      validationErrors.some(({ severity }) => severity === 'error')
        ? validationErrors
        : [...validationErrors, ...definitionValidationErrors],
    [validationErrors, definitionValidationErrors]
  );

  const schemas = useMemo(() => {
    const jsonSchema = getFieldDefinitionJsonSchema();
    if (!jsonSchema) return [];
    return [{ uri: FIELD_DEFINITION_SCHEMA_URI, fileMatch: ['*'], schema: jsonSchema }];
  }, []);

  return (
    <EuiPanel hasBorder paddingSize="none" css={containerCss(height)} data-test-subj={dataTestSubj}>
      <div css={editorContainerCss}>
        <TemplateYamlEditorBase
          value={value}
          onChange={onChange}
          schemas={schemas}
          onValidationChange={handleValidationChange}
          onEditorMount={handleEditorMount}
        />
        {isEditorMounted ? (
          <TemplateActionsMenu
            editor={editorRef.current}
            value={value}
            onChange={onChange}
            mode="fieldDefinition"
          />
        ) : null}
      </div>
      <div css={validationFooterCss}>
        <TemplateYamlValidationAccordion
          isMounted={isEditorMounted}
          validationErrors={allValidationErrors}
          onErrorClick={handleErrorClick}
        />
      </div>
    </EuiPanel>
  );
};

FieldDefinitionYamlEditor.displayName = 'FieldDefinitionYamlEditor';
