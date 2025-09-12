/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { i18nMessages } from '../i18n';
import { ToolFormSection } from '../components/tool_form_section';
import { ToolFormMode } from '../tool_form';
import type { ToolFormData } from '../types/tool_form_types';
export interface SystemReferencesProps {
  mode: ToolFormMode;
}
export const SystemReferences = ({ mode }: SystemReferencesProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    control,
    formState: { errors },
  } = useFormContext<ToolFormData>();

  const isReadOnly = mode === ToolFormMode.View;
  const isToolIdDisabled = mode === ToolFormMode.Edit || isReadOnly;

  return (
    <ToolFormSection
      title={i18nMessages.systemReferences.documentation.title}
      icon="bullseye"
      description={i18nMessages.systemReferences.documentation.description}
      content={
        <EuiFlexGroup
          direction="column"
          css={css`
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            padding: ${euiTheme.size.base};
          `}
        >
          <EuiText color={euiTheme.colors.textHeading}>
            <h4>{i18nMessages.systemReferences.documentation.fieldsHelp.title}</h4>
          </EuiText>
          <EuiFlexItem grow={0}>
            <EuiText size="s">
              <strong>{i18nMessages.systemReferences.documentation.fieldsHelp.toolId.label}</strong>
              <EuiTextColor color="subdued">
                <div>
                  {i18nMessages.systemReferences.documentation.fieldsHelp.toolId.description}
                </div>
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            <EuiText size="s">
              <strong>
                {i18nMessages.systemReferences.documentation.fieldsHelp.description.label}
              </strong>
              <EuiTextColor color="subdued">
                <div>
                  {i18nMessages.systemReferences.documentation.fieldsHelp.description.description}
                </div>
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      documentation={{
        title: i18nMessages.systemReferences.documentation.toolBasicsDocumentationLink,
        href: '#', // TODO: add documentation link when available
      }}
    >
      <EuiFormRow
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
        label={i18nMessages.systemReferences.form.description.label}
        isInvalid={!!errors.description}
        error={errors.description?.message}
      >
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <EuiMarkdownEditor
              aria-label={i18nMessages.systemReferences.form.description.label}
              readOnly={isReadOnly}
              {...field}
            />
          )}
        />
      </EuiFormRow>
    </ToolFormSection>
  );
};
