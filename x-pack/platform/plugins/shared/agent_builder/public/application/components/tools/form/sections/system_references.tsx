/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiMarkdownEditorRef } from '@elastic/eui';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiSelect,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useRef, useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { ToolType } from '@kbn/agent-builder-common';
import { useToolTypes } from '../../../../hooks/tools/use_tool_type_info';
import { ToolFormSection } from '../components/tool_form_section';
import { i18nMessages } from '../i18n';
import { ToolFormMode } from '../tool_form';
import type { ToolFormData } from '../types/tool_form_types';
import { getEditableToolTypes } from '../registry/tools_form_registry';

export interface SystemReferencesProps {
  mode: ToolFormMode;
  toolType?: ToolType;
  setToolType?: (toolType: ToolType) => void;
}
export const SystemReferences = ({ mode, toolType, setToolType }: SystemReferencesProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    control,
    formState: { errors },
  } = useFormContext<ToolFormData>();

  const type = useWatch({ control, name: 'type' });

  useEffect(() => {
    if (type && type !== toolType && setToolType) {
      setToolType(type);
    }
  }, [type, toolType, setToolType]);

  const descriptionRef = useRef<EuiMarkdownEditorRef>(null);

  const isReadOnly = mode === ToolFormMode.View;
  const isToolIdDisabled = mode === ToolFormMode.Edit || isReadOnly;

  const { toolTypes: serverToolTypes, isLoading: toolTypesLoading } = useToolTypes();

  const editableToolTypes = useMemo(() => {
    let editableTypes = getEditableToolTypes();
    if (!toolTypesLoading && serverToolTypes) {
      const serverEnabledEditableTypes = serverToolTypes
        .filter((st) => st.create)
        .map((st) => st.type);

      editableTypes = editableTypes.filter((t) => serverEnabledEditableTypes.includes(t.value));
    }
    return editableTypes;
  }, [serverToolTypes, toolTypesLoading]);

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
    >
      <EuiFormRow label={i18nMessages.configuration.form.type.label} error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field: { ref, ...field } }) => (
            <EuiSelect
              data-test-subj="agentBuilderToolTypeSelect"
              options={editableToolTypes}
              {...field}
              inputRef={ref}
              disabled={isToolIdDisabled}
            />
          )}
        />
      </EuiFormRow>
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
