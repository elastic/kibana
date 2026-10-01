/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, MutableRefObject } from 'react';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import { FormProvider, useForm, useFormState } from 'react-hook-form';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { FieldType } from '../../../../common/types/domain/template/fields';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../../common/utils';
import { FieldsRenderer } from '../../templates_v2/field_types/field_renderer';
import { useSectionEdit } from '../../templates_v2/field_types/section_edit_context';
import { getYamlDefaultAsString } from '../../templates_v2/utils';
import type { OnUpdateFields } from '../types';

export const EMPTY_EXTENDED_FIELDS: Record<string, unknown> = {};

/** The snake-keyed extended fields whose value differs from the last saved one. */
const getChangedKeys = (dirtyFields: FieldValues | undefined): string[] =>
  Object.entries((dirtyFields?.[CASE_EXTENDED_FIELDS] ?? {}) as Record<string, boolean>)
    .filter(([, isDirty]) => isDirty)
    .map(([key]) => key);

/**
 * Parses a CHECKBOX_GROUP form value (JSON string or plain array) into a `string[]`.
 * Mirrors the `toArray` logic in `checkbox_group.tsx`.
 */
const parseCheckboxItems = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value !== '') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * Returns `existingValue` only when it is still valid under the new field definition.
 *
 * For option-based controls (SELECT_BASIC, RADIO_GROUP, CHECKBOX_GROUP) a value that
 * was valid under a previous template may no longer be a member of the new template's
 * option set. Passing such a value through `trigger()` won't catch it (client-side
 * validation only checks non-empty, not option membership), but the server rejects it
 * with a 400. Returning `undefined` here lets the required-field check surface the gap
 * to the user so they can re-pick before confirming the template switch.
 *
 * TOGGLE is also validated here as a defensive guard: a toggle's valid domain is
 * `true | false | 'true' | 'false'`, so any other carried-over value (e.g. a stale or
 * hand-edited `"high"`) would pass client validation but be rejected by the server
 * (`must be either true or false`). A toggle now stores under its own `_as_boolean`
 * key, so it can no longer collide with a keyword control's `_as_keyword` value, but the
 * domain check is cheap and keeps a malformed value from reaching the server.
 *
 * Controls whose valid domain is template-independent and whose values cannot conflict
 * across control types (INPUT_TEXT, TEXTAREA, INPUT_NUMBER, DATE_PICKER, USER_PICKER)
 * are intentionally passed through unchanged.
 */
const sanitizeExistingValue = (field: InlineField, existingValue: unknown): unknown => {
  if (existingValue === undefined || existingValue === '') return undefined;

  if (field.control === FieldType.SELECT_BASIC || field.control === FieldType.RADIO_GROUP) {
    const { options } = field.metadata;
    return typeof existingValue === 'string' && options.includes(existingValue)
      ? existingValue
      : undefined;
  }

  if (field.control === FieldType.CHECKBOX_GROUP) {
    const { options } = field.metadata;
    const validItems = parseCheckboxItems(existingValue).filter((item) => options.includes(item));
    return validItems.length > 0 ? JSON.stringify(validItems) : undefined;
  }

  if (field.control === FieldType.TOGGLE) {
    // A toggle only ever stores 'true' | 'false'. Guard against any other value (e.g. a
    // stale or hand-edited 'high') that would pass client validation but be rejected by
    // the server with a 400.
    return existingValue === true ||
      existingValue === false ||
      existingValue === 'true' ||
      existingValue === 'false'
      ? existingValue
      : undefined;
  }

  return existingValue;
};

/**
 * API exposed to a parent component when the form is used in batch mode
 * (i.e. `formApiRef` is provided). The parent calls `trigger()` to validate
 * all visible fields and, if valid, reads `getValues()` to collect the current
 * snake-keyed field values.
 */
export interface TemplateFieldsFormApi {
  trigger: () => Promise<boolean>;
  getValues: () => Record<string, unknown>;
}

interface TemplateFieldsFormReadyBaseProps {
  resolvedFields: InlineField[];
  extendedFields: Record<string, unknown>;
}

interface AutosaveProps extends TemplateFieldsFormReadyBaseProps {
  /** Per-field autosave mode (default). Required when `formApiRef` is not provided. */
  onUpdateField: (args: OnUpdateFields) => void;
  formApiRef?: never;
  applyDefaults?: never;
}

interface BatchProps extends TemplateFieldsFormReadyBaseProps {
  /**
   * Batch / validate-all mode. When provided, per-field autosave is disabled and the
   * parent drives validation and value collection through this ref.
   */
  formApiRef: MutableRefObject<TemplateFieldsFormApi | null>;
  /**
   * When `true`, seed each field's initial value with the template YAML default when
   * the case has no existing value for that field (i.e. carry-over logic). Only
   * meaningful in batch mode; ignored in autosave mode.
   */
  applyDefaults?: boolean;
  onUpdateField?: never;
}

export type TemplateFieldsFormReadyProps = AutosaveProps | BatchProps;

export const TemplateFieldsFormReady: FC<TemplateFieldsFormReadyProps> = ({
  resolvedFields,
  extendedFields,
  onUpdateField,
  formApiRef,
  applyDefaults = false,
}) => {
  const isBatchMode = formApiRef != null;

  const initialDefaultValues = useMemo<FieldValues>(() => {
    const inner: Record<string, unknown> = {};
    for (const field of resolvedFields) {
      const snakeKey = getFieldSnakeKey(field.name, field.type);
      const camelKey = getFieldCamelKey(field.name, field.type);
      const existingValue = extendedFields[camelKey];
      if (isBatchMode && applyDefaults) {
        // Sanitize option-based values so stale selections from a previous template
        // don't silently bypass server-side validation. Non-option controls are passed through.
        const sanitized = sanitizeExistingValue(field, existingValue);
        inner[snakeKey] =
          sanitized !== undefined && sanitized !== ''
            ? sanitized
            : getYamlDefaultAsString(field.metadata?.default);
      } else {
        inner[snakeKey] = existingValue ?? '';
      }
    }
    return { [CASE_EXTENDED_FIELDS]: inner };
  }, [resolvedFields, extendedFields, isBatchMode, applyDefaults]);

  const form = useForm<FieldValues>({
    defaultValues: initialDefaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    form.reset(initialDefaultValues, { keepDirtyValues: true });
  }, [initialDefaultValues, form]);

  // Register the form API on the ref so the parent can drive validation and read values.
  useEffect(() => {
    if (!formApiRef) return;
    formApiRef.current = {
      trigger: () => form.trigger(),
      getValues: () => form.getValues(CASE_EXTENDED_FIELDS) as Record<string, unknown>,
    };
    return () => {
      formApiRef.current = null;
    };
  }, [formApiRef, form]);

  // Present only inside a section that owns edit mode for every form in it (the redesigned sidebar).
  // Its absence keeps the legacy case view on per-field confirm.
  const sectionEdit = useSectionEdit();
  const isSectionMode = !isBatchMode && sectionEdit != null;
  const { dirtyFields } = useFormState({ control: form.control });

  // Recomputed every render rather than memoized on `dirtyFields`: react-hook-form mutates that
  // object in place, so its identity does not change when a field becomes dirty and a memo keyed on
  // it would report zero changes forever.
  const changedCount = getChangedKeys(dirtyFields).length;

  const formId = useId();

  const collect = useCallback(async () => {
    const isValid = await form.trigger().catch(() => false);
    if (!isValid) {
      return null;
    }
    // Read the dirty set at call time rather than closing over it, so `collect` keeps a stable
    // identity and the registration effect below does not re-run on every keystroke.
    const keys = getChangedKeys(form.formState.dirtyFields);
    const values = form.getValues(CASE_EXTENDED_FIELDS) as Record<string, unknown>;
    return Object.fromEntries(keys.map((key) => [key, values[key]]));
  }, [form]);

  const commit = useCallback(() => {
    form.reset(form.getValues());
  }, [form]);

  const resetToCommitted = useCallback(() => {
    form.reset(initialDefaultValues);
  }, [form, initialDefaultValues]);

  useEffect(() => {
    if (!isSectionMode || !sectionEdit) {
      return;
    }

    sectionEdit.registerForm(formId, {
      changedCount,
      collect,
      commit,
      reset: resetToCommitted,
    });
  }, [isSectionMode, sectionEdit, formId, changedCount, collect, commit, resetToCommitted]);

  const { unregisterForm } = sectionEdit ?? {};
  useEffect(() => {
    if (!isSectionMode || !unregisterForm) {
      return;
    }
    return () => unregisterForm(formId);
  }, [isSectionMode, unregisterForm, formId]);

  const inflightRef = useRef(false);
  const [savingFieldKey, setSavingFieldKey] = useState<string>();

  const releaseLock = useCallback(() => {
    inflightRef.current = false;
    setSavingFieldKey(undefined);
  }, []);

  const persist = useCallback(
    async (fieldName: string, fieldType: string, onPersisted?: () => void) => {
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
      if (!onUpdateField) return;
      onUpdateField({
        key: CASE_EXTENDED_FIELDS,
        value: { [snakeKey]: value },
        onSuccess: () => {
          form.resetField(path, { defaultValue: value });
          releaseLock();
          onPersisted?.();
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
          // In batch mode no per-field confirm/cancel buttons are shown; FieldsRenderer
          // already hides them when onFieldConfirm is undefined. Section mode replaces them with
          // the section's own Save/Cancel bar.
          onFieldConfirm={isBatchMode || isSectionMode ? undefined : persist}
          savingFieldKey={isBatchMode || isSectionMode ? undefined : savingFieldKey}
          viewMode={isSectionMode ? !sectionEdit?.isEditing : !isBatchMode}
          onSectionEditRequest={isSectionMode ? sectionEdit?.requestEdit : undefined}
        />
      </div>
    </FormProvider>
  );
};

TemplateFieldsFormReady.displayName = 'TemplateFieldsFormReady';
