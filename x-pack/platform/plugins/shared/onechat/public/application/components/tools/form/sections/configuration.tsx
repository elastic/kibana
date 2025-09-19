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
import { TOOL_TYPE_QUERY_PARAM } from '../../create_tool';
import { useQueryState } from '../../../../hooks/use_query_state';
import { getToolTypeConfig, getEditableToolTypes } from '../tools_form_registry';

export const Configuration = () => {
  const {
    formState: { errors },
    control,
  } = useFormContext<ToolFormData>();
  const type = useWatch({ control, name: 'type' });

  const [urlQueryToolType, setUrlQueryToolType] = useQueryState<ToolType>(TOOL_TYPE_QUERY_PARAM);

  useEffect(() => {
    if (type && type !== urlQueryToolType) {
      setUrlQueryToolType(type);
    }
  }, [type, urlQueryToolType, setUrlQueryToolType]);

  const toolConfig = getToolTypeConfig(type);
  const ConfigurationComponent = useMemo(() => {
    return toolConfig!.getConfigurationComponent();
  }, [toolConfig]);

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
            <EuiSelect options={getEditableToolTypes()} {...field} inputRef={ref} />
          )}
        />
      </EuiFormRow>
      <ConfigurationComponent />
    </ToolFormSection>
  );
};
