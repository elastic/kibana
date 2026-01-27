/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiMarkdownEditorRef } from '@elastic/eui';
import { EuiFieldText, EuiFormRow, EuiMarkdownEditor } from '@elastic/eui';
import React, { useRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { ToolFormSection } from '../components/tool_form_section';
import { i18nMessages } from '../i18n';
import { ToolFormMode } from '../tool_form';
import type { ToolFormData } from '../types/tool_form_types';

export interface DetailsProps {
  mode: ToolFormMode;
}
export const DetailsSection = ({ mode }: DetailsProps) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<ToolFormData>();

  const descriptionRef = useRef<EuiMarkdownEditorRef>(null);

  const isReadOnly = mode === ToolFormMode.View;
  const isToolIdDisabled = mode === ToolFormMode.Edit || isReadOnly;

  return (
    <ToolFormSection
      title={i18nMessages.systemReferences.documentation.title}
      icon="bullseye"
      description={i18nMessages.systemReferences.documentation.description}
    >
      <EuiFormRow
        data-test-subj="agentBuilderToolIdRow"
        isDisabled={isToolIdDisabled}
        label={i18nMessages.systemReferences.form.toolId.label}
        isInvalid={!!errors.toolId}
        helpText={i18nMessages.systemReferences.form.toolId.helpText}
        error={errors.toolId?.message}
      >
        <Controller
          control={control}
          name="toolId"
          render={({ field: { ref, ...field }, fieldState: { invalid } }) => (
            <EuiFieldText
              data-test-subj="agentBuilderToolIdInput"
              disabled={isToolIdDisabled}
              placeholder="namespace.tool_name (e.g., acme.financial.search)"
              readOnly={isReadOnly}
              {...field}
              inputRef={ref}
              isInvalid={invalid}
            />
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        data-test-subj="agentBuilderToolDescriptionRow"
        label={i18nMessages.systemReferences.form.description.label}
        isInvalid={!!errors.description}
        error={errors.description?.message}
      >
        <Controller
          control={control}
          name="description"
          render={({ field: { ref, ...field } }) => {
            ref(descriptionRef.current?.textarea);
            return (
              <EuiMarkdownEditor
                data-test-subj="agentBuilderToolDescriptionEditor"
                aria-label={i18nMessages.systemReferences.form.description.label}
                readOnly={isReadOnly}
                ref={descriptionRef}
                {...field}
              />
            );
          }}
        />
      </EuiFormRow>
    </ToolFormSection>
  );
};
