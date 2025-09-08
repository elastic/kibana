/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { ToolType } from '@kbn/onechat-common/tools/definition';
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useHistory, useParams } from 'react-router-dom';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { appPaths } from '../../../../utils/app_paths';
import { ToolFormSection } from '../components/esql/tool_form_section';
import { i18nMessages } from '../i18n';
import type { ToolFormData } from '../types/tool_form_types';
import { EsqlConfiguration } from './configuration_fields/esql_configuration_fields';
import { IndexSearchConfiguration } from './configuration_fields/index_search_configuration_fields';

export const Configuration = () => {
  const {
    formState: { errors },
    control,
  } = useFormContext<ToolFormData>();
  const type = useWatch({ control, name: 'type' });
  const [searchParams, setSearchParams] = useSearchParams();
  const history = useHistory();
  const { toolType: toolTypeInPath } = useParams<{ toolType?: string }>();

  // Keep URL search param in sync when selection changes
  useEffect(() => {
    if (!type) return;
    const current = searchParams.get('toolType');
    if (current !== type) {
      const next = new URLSearchParams(searchParams.toString());
      next.set('toolType', type);
      setSearchParams(next, { replace: true });
    }

    // If we're on the create route with a path param, keep it in sync too
    if (toolTypeInPath && toolTypeInPath !== type) {
      const nextPath = appPaths.tools.newWithType({ toolType: type });
      history.replace({ pathname: nextPath, search: searchParams.toString() });
    }
  }, [type, searchParams, setSearchParams, toolTypeInPath, history]);

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
                { text: i18nMessages.configuration.form.type.esqlOption, value: 'esql' },
                {
                  text: i18nMessages.configuration.form.type.indexSearchOption,
                  value: 'index_search',
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
