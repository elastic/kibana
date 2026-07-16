/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../../common/utils';
import { FieldsRenderer } from '../../templates_v2/field_types/field_renderer';
import type { OnUpdateFields } from '../types';

export const EMPTY_EXTENDED_FIELDS: Record<string, unknown> = {};

export const TemplateFieldsFormReady: FC<{
  resolvedFields: InlineField[];
  extendedFields: Record<string, unknown>;
  onUpdateField: (args: OnUpdateFields) => void;
}> = ({ resolvedFields, extendedFields, onUpdateField }) => {
  const initialDefaultValues = useMemo<FieldValues>(() => {
    const inner: Record<string, unknown> = {};
    for (const field of resolvedFields) {
      const snakeKey = getFieldSnakeKey(field.name, field.type);
      const camelKey = getFieldCamelKey(field.name, field.type);
      inner[snakeKey] = extendedFields[camelKey] ?? '';
    }
    return { [CASE_EXTENDED_FIELDS]: inner };
  }, [resolvedFields, extendedFields]);

  const form = useForm<FieldValues>({
    defaultValues: initialDefaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    form.reset(initialDefaultValues, { keepDirtyValues: true });
  }, [initialDefaultValues, form]);

  const inflightRef = useRef(false);
  const [savingFieldKey, setSavingFieldKey] = useState<string>();

  const releaseLock = useCallback(() => {
    inflightRef.current = false;
    setSavingFieldKey(undefined);
  }, []);

  const persist = useCallback(
    async (fieldName: string, fieldType: string) => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      const snakeKey = getFieldSnakeKey(fieldName, fieldType);
      setSavingFieldKey(snakeKey);
      const path = `${CASE_EXTENDED_FIELDS}.${snakeKey}`;
      const isValid = await form.trigger(path).catch(() => false);
      if (!isValid) {
        releaseLock();
        return;
      }
      const value = form.getValues(path);
      onUpdateField({
        key: CASE_EXTENDED_FIELDS,
        value: { [snakeKey]: value },
        onSuccess: () => {
          form.resetField(path, { defaultValue: value });
          releaseLock();
        },
        onError: releaseLock,
      });
    },
    [form, onUpdateField, releaseLock]
  );

  return (
    <FormProvider {...form}>
      <div data-test-subj="template-fields-form">
        <FieldsRenderer
          resolvedFields={resolvedFields}
          onFieldConfirm={persist}
          savingFieldKey={savingFieldKey}
        />
      </div>
    </FormProvider>
  );
};

TemplateFieldsFormReady.displayName = 'TemplateFieldsFormReady';
