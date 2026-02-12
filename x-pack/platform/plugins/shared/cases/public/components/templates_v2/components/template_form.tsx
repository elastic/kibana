/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButton, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import React, { useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useCasesTemplatesNavigation } from '../../../common/navigation';
import { useCreateTemplate } from '../hooks/use_create_template';
import { useUpdateTemplate } from '../hooks/use_update_template';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useAvailableCasesOwners } from '../../app/use_available_owners';
import { getOwnerDefaultValue } from '../../create/utils';

import * as i18n from '../translations';

const styles = {
  editorContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      height: '50vh',
      width: '100%',
      padding: euiTheme.size.xs,
    }),
};

export interface TemplateFormValues {
  name: string;
  owner: string;
  definition: string;
}

export const TemplateFormFields = () => {
  const euiTheme = useEuiTheme();
  const { control } = useFormContext<TemplateFormValues>();

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

TemplateFormFields.displayName = 'TemplateFormFields';

export const CreateTemplateForm = () => {
  const { handleSubmit } = useFormContext<TemplateFormValues>();
  const { mutateAsync, isLoading } = useCreateTemplate();

  const { owner } = useCasesContext();
  const availableOwners = useAvailableCasesOwners();
  const defaultOwnerValue = owner[0] ?? getOwnerDefaultValue(availableOwners);
  const { navigateToCasesTemplates } = useCasesTemplatesNavigation();

  const onSubmit = useCallback(
    async (data: { name: string; owner: string; definition: string }) => {
      await mutateAsync({
        template: {
          owner: defaultOwnerValue,
          definition: data.definition,
        },
      });
      navigateToCasesTemplates();
    },
    [defaultOwnerValue, mutateAsync, navigateToCasesTemplates]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TemplateFormFields />

      <EuiSpacer />

      <div>
        <EuiButton type="submit" isLoading={isLoading}>
          {i18n.SAVE_TEMPLATE}
        </EuiButton>
      </div>
    </form>
  );
};

CreateTemplateForm.displayName = 'CreateTemplateForm';

export const UpdateTemplateForm = ({ templateId }: { templateId: string }) => {
  const { handleSubmit } = useFormContext<TemplateFormValues>();
  const { mutateAsync, isLoading } = useUpdateTemplate();
  const { navigateToCasesTemplates } = useCasesTemplatesNavigation();

  const onSubmit = useCallback(
    async (data: TemplateFormValues) => {
      await mutateAsync({
        templateId,
        template: {
          definition: data.definition,
        },
      });
      navigateToCasesTemplates();
    },
    [mutateAsync, navigateToCasesTemplates, templateId]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TemplateFormFields />

      <EuiSpacer />

      <div>
        <EuiButton type="submit" isLoading={isLoading}>
          {i18n.SAVE_TEMPLATE}
        </EuiButton>
      </div>
    </form>
  );
};

UpdateTemplateForm.displayName = 'UpdateTemplateForm';
