/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { FormProvider, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useToasts } from '../../../common/lib/kibana';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { EditableFieldWrapper } from './editable_field_wrapper';
import type { controlRegistry } from '../../templates_v2/field_types/field_types_registry';
import * as i18n from '../translations';

type PropsOf<T> = T extends FC<infer P> ? P : never;
type FieldRegistryComponent = (typeof controlRegistry)[keyof typeof controlRegistry];

export interface EditFieldAdapterProps<TComponent extends FieldRegistryComponent> {
  value: string | string[];
  onSubmit: (value: unknown) => void;
  isLoading: boolean;
  'data-test-subj'?: string;
  FieldComponent: TComponent;
  componentProps: PropsOf<TComponent>;
}

export const EditFieldAdapter = <TComponent extends FieldRegistryComponent>({
  value,
  onSubmit,
  isLoading,
  'data-test-subj': dataTestSubj = 'edit-field',
  FieldComponent,
  componentProps,
}: EditFieldAdapterProps<TComponent>) => {
  const toasts = useToasts();
  const { name, type, label } = componentProps;
  const fieldKey = useMemo(() => `${name}_as_${type}`, [name, type]);

  const { form } = useForm({
    defaultValue: {
      [CASE_EXTENDED_FIELDS]: {
        [fieldKey]: value,
      },
    },
    options: { stripEmptyFields: false },
  });

  const handleEnterEdit = useCallback(() => {
    form.reset({
      defaultValue: {
        [CASE_EXTENDED_FIELDS]: {
          [fieldKey]: value,
        },
      },
    });
  }, [form, fieldKey, value]);

  const handleSubmit = useCallback(async () => {
    try {
      const { isValid, data } = await form.submit();
      if (isValid && data) {
        onSubmit(data[CASE_EXTENDED_FIELDS]?.[fieldKey]);
      }
    } catch (error) {
      toasts.addError(error as Error, {
        title: i18n.FIELD_SUBMISSION_ERROR,
      });
    }
  }, [form, fieldKey, onSubmit, toasts]);

  const displayValue = Array.isArray(value)
    ? value.length > 0
      ? value.join(', ')
      : i18n.FIELD_NOT_DEFINED
    : value || i18n.FIELD_NOT_DEFINED;

  return (
    <FormProvider form={form}>
      <EditableFieldWrapper
        title={label ?? name}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onEnterEdit={handleEnterEdit}
        displayContent={
          <EuiText size="s" data-test-subj={`${dataTestSubj}-value`}>
            {displayValue}
          </EuiText>
        }
        data-test-subj={dataTestSubj}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <FieldComponent {...(componentProps as any)} />
      </EditableFieldWrapper>
    </FormProvider>
  );
};

EditFieldAdapter.displayName = 'EditFieldAdapter';
