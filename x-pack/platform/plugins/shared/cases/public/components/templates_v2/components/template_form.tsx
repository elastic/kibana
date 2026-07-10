/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiIcon, EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import { css, Global } from '@emotion/react';
import * as i18n from '../translations';
import {
  getTemplateDefinitionJsonSchema,
  TEMPLATE_SCHEMA_URI,
} from '../utils/template_json_schema';
import { TemplateYamlEditorBase } from './template_yaml_editor';
import { TemplateYamlValidationAccordion } from './template_yaml_validation_accordion';
import { useValidationAccordionPositioning } from '../hooks/use_validation_accordion_positioning';
import { useFieldNameValidation } from '../hooks/use_field_name_validation';
import { useUserPickerValidation } from '../hooks/use_user_picker_validation';
import { useLineDifferencesDecorations } from '../hooks/use_line_differences_decorations';
import { useKibana } from '../../../common/lib/kibana';

export interface YamlEditorFormValues {
  definition: string;
}

export interface TemplateYamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  isSaving?: boolean;
  isSaved?: boolean;
  savedValue?: string;
}

const styles = {
  // Full-height flex column: editor fills the space, validation footer sits inline
  // at the bottom so it always tracks the panel width (no fixed positioning).
  editorColumn: css({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  }),
  editorContainer: css({
    flex: '1 1 0',
    minHeight: 0,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  }),
  validationFooter: css({
    flexShrink: 0,
    overflow: 'hidden',
  }),
  statusIndicator: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: euiTheme.size.s,
      right: euiTheme.size.base,
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
      paddingBlock: euiTheme.size.xxs,
      paddingInline: euiTheme.size.s,
      borderRadius: euiTheme.border.radius.medium,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
      pointerEvents: 'none',
    }),
  changedLineGlobal: ({ euiTheme }: UseEuiTheme) =>
    css({
      '.templateChangedLineDecoration': {
        background: euiTheme.colors.warning,
        width: '3px !important',
        marginLeft: '3px',
      },
    }),
};

export const TemplateYamlEditor = ({
  value,
  onChange,
  isSaving = false,
  isSaved = false,
  savedValue,
}: TemplateYamlEditorProps) => {
  const euiTheme = useEuiTheme();
  const { security } = useKibana().services;

  const {
    editorRef,
    validationErrors,
    isEditorMounted,
    handleValidationChange,
    handleEditorMount,
    handleErrorClick,
  } = useValidationAccordionPositioning();

  useFieldNameValidation(editorRef.current, value);
  useUserPickerValidation(editorRef.current, value, security);
  useLineDifferencesDecorations({
    editor: editorRef.current,
    savedValue,
    currentValue: value,
  });

  const schemas = useMemo(() => {
    const jsonSchema = getTemplateDefinitionJsonSchema();
    if (!jsonSchema) {
      return [];
    }
    return [
      {
        uri: TEMPLATE_SCHEMA_URI,
        fileMatch: ['*'],
        schema: jsonSchema,
      },
    ];
  }, []);

  return (
    <div css={styles.editorColumn}>
      <Global styles={styles.changedLineGlobal(euiTheme)} />
      <div css={styles.editorContainer}>
        {(isSaving || isSaved) && (
          <div css={styles.statusIndicator(euiTheme)} data-test-subj="templateDraftStatus">
            {isSaving ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <EuiIcon type="checkInCircleFilled" color="success" size="s" aria-hidden={true} />
            )}
            <EuiText size="xs" color="subdued">
              {isSaving ? i18n.SAVING_DRAFT : i18n.DRAFT_SAVED}
            </EuiText>
          </div>
        )}
        <TemplateYamlEditorBase
          value={value}
          onChange={onChange}
          schemas={schemas}
          onValidationChange={handleValidationChange}
          onEditorMount={handleEditorMount}
        />
      </div>
      <div css={styles.validationFooter}>
        <TemplateYamlValidationAccordion
          isMounted={isEditorMounted}
          validationErrors={validationErrors}
          onErrorClick={handleErrorClick}
        />
      </div>
    </div>
  );
};

TemplateYamlEditor.displayName = 'TemplateYamlEditor';
