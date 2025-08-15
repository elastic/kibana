/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { FieldPath, useFormContext } from 'react-hook-form';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { OnechatEsqlParam, OnechatEsqlToolFormData } from '../types/esql_tool_form_types';
import { i18nMessages } from '../i18n';

export const useEsqlParamsValidation = () => {
  const { getValues, setValue, trigger } = useFormContext<OnechatEsqlToolFormData>();

  const triggerEsqlParamWarnings = useCallback(() => {
    const esql = getValues('esql');
    const formParams = getValues('params');
    if (!formParams) return;

    const inferredParams = new Set(getESQLQueryVariables(esql));

    formParams.forEach((param, index) => {
      const shouldWarn = param.name && !inferredParams.has(param.name);

      setValue(
        `params.${index}.warning`,
        shouldWarn ? i18nMessages.paramUnusedWarning(param.name) : undefined,
        {
          shouldValidate: false,
          shouldDirty: true,
        }
      );
    });
  }, [getValues, setValue]);

  const triggerEsqlParamFieldsValidation = useCallback(
    (fieldsToValidate: Array<keyof OnechatEsqlParam>) => {
      const fieldPaths = getValues('params').flatMap((_, i) =>
        fieldsToValidate.map((field) => `params.${i}.${field}`)
      ) as Array<FieldPath<OnechatEsqlToolFormData>>;
      trigger(fieldPaths);
    },
    [trigger, getValues]
  );

  return {
    triggerEsqlParamWarnings,
    triggerEsqlParamFieldsValidation,
  };
};
