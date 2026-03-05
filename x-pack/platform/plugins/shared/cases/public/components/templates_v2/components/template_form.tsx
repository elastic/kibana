/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiBadge, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useFormContext } from 'react-hook-form';
import { useDebouncedYamlEdit } from '../hooks/use_debounced_yaml_edit';
import {
  getTemplateDefinitionJsonSchema,
  TEMPLATE_SCHEMA_URI,
} from '../utils/template_json_schema';
import { TemplateYamlEditorBase } from './template_yaml_editor';
import { TemplateYamlValidationAccordion } from './template_yaml_validation_accordion';
import { useValidationAccordionPositioning } from '../hooks/use_validation_accordion_positioning';
import * as i18n from '../translations';

export interface YamlEditorFormValues {
  definition: string;
}

export interface TemplateYamlEditorProps {
  storageKey: string;
  initialValue: string;
  templateId?: string;
}

const styles = {
  editorContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      width: '100%',
      padding: euiTheme.size.xs,
      position: 'relative',
    }),
  statusIndicator: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: euiTheme.size.s,
      right: euiTheme.size.s,
      zIndex: 1,
    }),
  validationContainer: css({
    position: 'fixed',
    bottom: '60px',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column-reverse',
    '& > *': {
      pointerEvents: 'auto',
    },
  }),
};

export const TemplateYamlEditor = ({
  storageKey,
  initialValue,
  templateId,
}: TemplateYamlEditorProps) => {
  const euiTheme = useEuiTheme();
  const { setValue } = useFormContext<YamlEditorFormValues>();

  const {
    containerRef,
    accordionRef,
    containerBounds,
    accordionHeight,
    portalNode,
    validationErrors,
    isEditorMounted,
    handleValidationChange,
    handleEditorMount,
    handleErrorClick,
  } = useValidationAccordionPositioning();

  const { value, onChange, isSaving, isSaved } = useDebouncedYamlEdit(
    storageKey,
    initialValue,
    (newValue) => setValue('definition', newValue),
    templateId
  );

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

  const editorPaddingBottom = `${accordionHeight + 8}px`;

  return (
    <>
      <div
        ref={containerRef}
        css={styles.editorContainer(euiTheme)}
        style={{ paddingBottom: editorPaddingBottom }}
      >
        {isSaving && (
          <div css={styles.statusIndicator(euiTheme)}>
            <EuiLoadingSpinner size="m" />
          </div>
        )}
        {isSaved && (
          <div css={styles.statusIndicator(euiTheme)}>
            <EuiBadge color="success">{i18n.TEMPLATE_SAVED}</EuiBadge>
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
      {portalNode &&
        createPortal(
          <div
            ref={accordionRef}
            css={styles.validationContainer}
            style={{
              left: `${containerBounds.left}px`,
              width: `${containerBounds.width}px`,
            }}
          >
            <TemplateYamlValidationAccordion
              isMounted={isEditorMounted}
              validationErrors={validationErrors}
              onErrorClick={handleErrorClick}
            />
          </div>,
          portalNode
        )}
    </>
  );
};

TemplateYamlEditor.displayName = 'TemplateYamlEditor';
