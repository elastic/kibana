/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import React, { useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { OWNERS, OWNER_INFO } from '../../../../common/constants';
import { useCreateTemplate } from '../hooks/use_create_template';

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
  const { control, handleSubmit } = useFormContext<{
    name: string;
    owner: string;
    definition: string;
  }>();
  const { mutateAsync, isLoading } = useCreateTemplate();

  const ownerOptions = OWNERS.map((owner) => ({
    value: owner,
    text: OWNER_INFO[owner].label,
  }));

  const onSubmit = useCallback(
    async (data: { name: string; owner: string; definition: string }) => {
      await mutateAsync({
        template: {
          name: data.name,
          owner: data.owner,
          definition: data.definition,
        },
      });
    },
    [mutateAsync]
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      css={{ width: '100%', height: '70vh', overflowY: 'scroll' }}
    >
      <EuiFormRow label="Template name">
        <Controller
          control={control}
          name="name"
          render={({ field }) => <EuiFieldText {...field} />}
        />
      </EuiFormRow>

      <EuiFormRow label="Owner">
        <Controller
          control={control}
          name="owner"
          render={({ field }) => <EuiSelect {...field} options={ownerOptions} />}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

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
        <EuiButton type="submit" isLoading={isLoading}>{`Save`}</EuiButton>
      </div>
    </form>
  );
};

CreateTemplateForm.displayName = 'CreateTemplateForm';
