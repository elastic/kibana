/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { ToolType } from '@kbn/onechat-common';
import React, { useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { ToolFormSection } from '../components/tool_form_section';
import { i18nMessages } from '../i18n';
import type { ToolFormData } from '../types/tool_form_types';
import { getToolTypeConfig, getEditableToolTypes } from '../registry/tools_form_registry';
import { ToolFormMode } from '../tool_form';

interface ConfigurationProps {
  toolType: ToolType;
  setToolType: (toolType: ToolType) => void;
  mode: ToolFormMode;
}

export const Configuration = ({ toolType, setToolType, mode }: ConfigurationProps) => {
  const {
    formState: { errors },
    control,
  } = useFormContext<ToolFormData>();
  const type = useWatch({ control, name: 'type' });

  useEffect(() => {
    if (type && type !== toolType) {
      setToolType(type);
    }
  }, [type, toolType, setToolType]);

  const toolConfig = getToolTypeConfig(type);
  const ConfigurationComponent = useMemo(() => {
    return toolConfig!.getConfigurationComponent();
  }, [toolConfig]);

  const editableToolTypes = useMemo(() => {
    return getEditableToolTypes();
  }, []);

  return (
    <ToolFormSection
      title={i18nMessages.configuration.documentation.title}
      icon="code"
      description={i18nMessages.configuration.documentation.description}
      documentation={{
        title: i18nMessages.configuration.documentation.documentationLink,
        href: '#', // TODO: add documentation link when available
      }}
    >
      <EuiFormRow label={i18nMessages.configuration.form.type.label} error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field: { ref, ...field } }) => (
            <EuiSelect
              options={editableToolTypes}
              {...field}
              inputRef={ref}
              disabled={mode === ToolFormMode.Edit}
            />
          )}
        />
      </EuiFormRow>
      <ConfigurationComponent />
    </ToolFormSection>
  );
};
