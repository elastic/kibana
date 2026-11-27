/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { getFieldSnakeKey } from '../../../../common/utils';
import { parseCaseFieldErrors } from '../../../../common/investigations/template_fields';
import { FieldsRenderer } from '../../../components/templates_v2/field_types/field_renderer';
import { getHttpErrorMessage } from '../../hooks';
import { getFieldKey, getValueFields, splitFieldErrors } from './field_utils';
import { ServerErrorsCallout } from './server_errors_callout';

export interface SaveFieldHandlers {
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

export interface AutosaveFieldsFormProps {
  fields: InlineField[];
  /** Saved values keyed `<name>_as_<type>`. */
  values: Record<string, string>;
  /** Saves one field. The form calls a handler when the save ends. */
  onSaveField: (key: string, value: string, handlers: SaveFieldHandlers) => void;
}

/**
 * Cases' field components with per-field save: each value is read, and Edit opens that one field
 * with its own Save and Cancel, as on the Cases case page. A refusal from Cases is shown at the
 * field that was saved.
 */
export const AutosaveFieldsForm: React.FC<AutosaveFieldsFormProps> = ({
  fields,
  values,
  onSaveField,
}) => {
  const valueFields = useMemo(() => getValueFields(fields), [fields]);

  const defaultValues = useMemo<FieldValues>(() => {
    const inner: Record<string, string> = {};
    valueFields.forEach((field) => {
      const key = getFieldKey(field);
      inner[key] = values[key] ?? '';
    });
    return { [CASE_EXTENDED_FIELDS]: inner };
  }, [valueFields, values]);

  const form = useForm<FieldValues>({ defaultValues, mode: 'onBlur' });

  // Follow values saved elsewhere (another tab, an agent, Change type) without losing an open edit.
  useEffect(() => {
    form.reset(defaultValues, { keepDirtyValues: true });
  }, [defaultValues, form]);

  const isSavingRef = useRef(false);
  const [savingKey, setSavingKey] = useState<string>();
  const [listedErrors, setListedErrors] = useState<string[]>([]);

  const release = useCallback(() => {
    isSavingRef.current = false;
    setSavingKey(undefined);
  }, []);

  const persist = useCallback(
    async (fieldName: string, fieldType: string, onPersisted?: () => void) => {
      if (isSavingRef.current) {
        return;
      }
      isSavingRef.current = true;
      const key = getFieldSnakeKey(fieldName, fieldType);
      const path = `${CASE_EXTENDED_FIELDS}.${key}`;
      setSavingKey(key);
      setListedErrors([]);

      const isValid = await form.trigger(path).catch(() => false);
      if (!isValid) {
        release();
        return;
      }

      const value = String(form.getValues(path) ?? '');
      onSaveField(key, value, {
        onSuccess: () => {
          form.resetField(path, { defaultValue: value });
          release();
          onPersisted?.();
        },
        onError: (error) => {
          const message = getHttpErrorMessage(error);
          const fieldErrors = parseCaseFieldErrors(message);
          if (fieldErrors.length === 0) {
            setListedErrors([message]);
          } else {
            const { targets, unmatched } = splitFieldErrors(fieldErrors, fields);
            // Only this field was written, so a message that names no field is about this one.
            [...targets, ...unmatched.map((text) => ({ key, message: text }))].forEach((target) =>
              form.setError(`${CASE_EXTENDED_FIELDS}.${target.key}`, {
                type: 'server',
                message: target.message,
              })
            );
          }
          release();
        },
      });
    },
    [fields, form, onSaveField, release]
  );

  return (
    <FormProvider {...form}>
      <div data-test-subj="investigationAutosaveFields">
        <FieldsRenderer
          resolvedFields={fields}
          onFieldConfirm={persist}
          savingFieldKey={savingKey}
          viewMode
        />
      </div>
      <ServerErrorsCallout
        messages={listedErrors}
        data-test-subj="investigationFieldsServerErrors"
      />
    </FormProvider>
  );
};
AutosaveFieldsForm.displayName = 'AutosaveFieldsForm';
