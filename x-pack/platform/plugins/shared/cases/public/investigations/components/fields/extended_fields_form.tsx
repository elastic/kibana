/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import React, { useEffect, useMemo } from 'react';
import type { FieldValues } from 'react-hook-form';
import { FormProvider, useForm, useFormState } from 'react-hook-form';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import type { CaseFieldError } from '../../../../common/investigations/template_fields';
import { FieldsRenderer } from '../../../components/templates_v2/field_types/field_renderer';
import { getYamlDefaultAsString } from '../../../components/templates_v2/utils';
import { getFieldKey, getValueFields, splitFieldErrors } from './field_utils';

/** Imperative handle of an `ExtendedFieldsForm`, used by the form that owns it. */
export interface ExtendedFieldsFormApi {
  /** Runs the Cases field validation on every visible field and shows the errors at the fields. */
  trigger: () => Promise<boolean>;
  /** Raw values of every field, keyed `<name>_as_<type>`. */
  getValues: () => Record<string, unknown>;
  /** Shows server errors at the fields they name. Returns the messages that name no field. */
  showServerErrors: (errors: CaseFieldError[]) => string[];
}

export interface ExtendedFieldsFormProps {
  /** Every field of the type. Used for default values and for `show_when` / `required_when`. */
  fields: InlineField[];
  /** The fields to draw. Defaults to all of them; the rest only feed the conditions. */
  renderedFields?: InlineField[];
  /** Current values keyed `<name>_as_<type>`. Missing keys start empty or at the YAML default. */
  initialValues?: Record<string, string>;
  /** Start fields without a value at their template default (creating a record). */
  applyTemplateDefaults?: boolean;
  formApiRef: MutableRefObject<ExtendedFieldsFormApi | null>;
  onDirtyChange?: (isDirty: boolean) => void;
}

const EMPTY_VALUES: Record<string, string> = {};

const DirtyReporter: React.FC<{ onDirtyChange: (isDirty: boolean) => void }> = ({
  onDirtyChange,
}) => {
  const { isDirty } = useFormState();
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);
  return null;
};
DirtyReporter.displayName = 'DirtyReporter';

/**
 * Cases' field components (`FieldsRenderer`) in a form of their own, so the owner can validate,
 * read the values and place server errors next to the fields. Conditions (`show_when`,
 * `required_when`) are evaluated by Cases' renderer.
 */
export const ExtendedFieldsForm: React.FC<ExtendedFieldsFormProps> = ({
  fields,
  renderedFields,
  initialValues = EMPTY_VALUES,
  applyTemplateDefaults = false,
  formApiRef,
  onDirtyChange,
}) => {
  const valueFields = useMemo(() => getValueFields(fields), [fields]);
  const drawn = renderedFields ?? fields;

  const defaultValues = useMemo<FieldValues>(() => {
    const inner: Record<string, string> = {};
    valueFields.forEach((field) => {
      const key = getFieldKey(field);
      const existing = initialValues[key];
      inner[key] =
        existing !== undefined
          ? existing
          : applyTemplateDefaults
          ? getYamlDefaultAsString(field.metadata?.default)
          : '';
    });
    return { [CASE_EXTENDED_FIELDS]: inner };
  }, [valueFields, initialValues, applyTemplateDefaults]);

  const form = useForm<FieldValues>({ defaultValues, mode: 'onBlur' });

  useEffect(() => {
    formApiRef.current = {
      trigger: () => form.trigger(),
      getValues: () => form.getValues(CASE_EXTENDED_FIELDS) as Record<string, unknown>,
      showServerErrors: (errors) => {
        const { targets, unmatched } = splitFieldErrors(errors, fields);
        targets.forEach(({ key, message }, index) =>
          form.setError(
            `${CASE_EXTENDED_FIELDS}.${key}`,
            { type: 'server', message },
            { shouldFocus: index === 0 }
          )
        );
        return unmatched;
      },
    };
    return () => {
      formApiRef.current = null;
    };
  }, [form, formApiRef, fields]);

  const conditionContextFields = useMemo(
    () => (renderedFields ? fields.filter((field) => !drawn.includes(field)) : undefined),
    [fields, renderedFields, drawn]
  );

  return (
    <FormProvider {...form}>
      {onDirtyChange ? <DirtyReporter onDirtyChange={onDirtyChange} /> : null}
      <div data-test-subj="investigationExtendedFieldsForm">
        <FieldsRenderer resolvedFields={drawn} conditionContextFields={conditionContextFields} />
      </div>
    </FormProvider>
  );
};
ExtendedFieldsForm.displayName = 'ExtendedFieldsForm';
