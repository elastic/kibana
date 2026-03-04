/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { useEuiTheme, EuiBadge, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { useFormContext } from 'react-hook-form';
import { useDebouncedYamlEdit } from '../hooks/use_debounced_yaml_edit';
import * as i18n from '../translations';

export interface YamlEditorFormValues {
  definition: string;
}

const styles = {
  editorContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
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
};

export const TemplateYamlEditor = () => {
  const euiTheme = useEuiTheme();
  const { setValue } = useFormContext<YamlEditorFormValues>();

  const { value, onChange, isSaving, isSaved } = useDebouncedYamlEdit((newValue) => {
    setValue('definition', newValue);
  });

  return (
    <div css={styles.editorContainer(euiTheme)}>
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
      <CodeEditor
        fullWidth
        height={'100%'}
        transparentBackground
        languageId="yaml"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

TemplateYamlEditor.displayName = 'TemplateYamlEditor';
