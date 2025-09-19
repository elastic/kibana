/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { ToolType } from '@kbn/onechat-common/tools/definition';
import React, { useEffect } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { ToolFormSection } from '../components/tool_form_section';
import { i18nMessages } from '../i18n';
import type { ToolFormData } from '../types/tool_form_types';
import { EsqlConfiguration } from './configuration_fields/esql_configuration_fields';
import { IndexSearchConfiguration } from './configuration_fields/index_search_configuration_fields';
import { TOOL_TYPE_QUERY_PARAM } from '../../create_tool';
import { useQueryState } from '../../../../hooks/use_query_state';

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

  const configurationFields =
    type === ToolType.esql ? (
      <EsqlConfiguration />
    ) : type === ToolType.index_search ? (
      <IndexSearchConfiguration />
    ) : null;

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
              options={[
                { text: i18nMessages.configuration.form.type.esqlOption, value: ToolType.esql },
                {
                  text: i18nMessages.configuration.form.type.indexSearchOption,
                  value: ToolType.index_search,
                },
              ]}
              {...field}
              inputRef={ref}
            />
          )}
        />
      </EuiFormRow>
      {configurationFields}
    </ToolFormSection>
  );
};
