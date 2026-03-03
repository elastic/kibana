/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { Controller, useFormContext } from 'react-hook-form';

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
    }),
};

export const TemplateYamlEditor = () => {
  const euiTheme = useEuiTheme();
  const { control } = useFormContext<YamlEditorFormValues>();

  return (
    <div css={styles.editorContainer(euiTheme)}>
      <Controller
        control={control}
        name="definition"
        render={({ field }) => {
          return (
            <CodeEditor
              fullWidth
              height={'100%'}
              transparentBackground
              languageId="yaml"
              value={field.value}
              onChange={(code) => field.onChange(code)}
            />
          );
        }}
      />
    </div>
  );
};

TemplateYamlEditor.displayName = 'TemplateYamlEditor';
