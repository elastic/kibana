/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButton, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import React, { useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

const styles = {
  editorContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      height: '75vh',
      width: '100%',
      padding: euiTheme.size.xs,
    }),
};

export const CreateTemplateForm = () => {
  const euiTheme = useEuiTheme();
  const { control, handleSubmit } = useFormContext<{ definition: string }>();

  const onSubmit = useCallback((data: { definition: string }) => {
    console.log('handle submit', data);
  }, []);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      css={{ width: '100%', height: '70vh', overflowY: 'scroll' }}
    >
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

      <div>
        <EuiButton type="submit">{`Save`}</EuiButton>
      </div>
    </form>
  );
};

CreateTemplateForm.displayName = 'CreateTemplateForm';
