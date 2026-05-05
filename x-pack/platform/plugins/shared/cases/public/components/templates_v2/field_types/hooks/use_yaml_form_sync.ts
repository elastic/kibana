/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import moment from 'moment-timezone';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import { getYamlDefaultAsString } from '../../utils';

export interface FieldInfo {
  name: string;
  type: string;
  control: string;
  metadata?: {
    default?: unknown;
    [key: string]: unknown;
  };
}

export type OnFieldDefaultChange = (fieldName: string, value: string, control: string) => void;

export const useYamlToFormSync = (
  form: FormHook,
  parsedFields: FieldInfo[],
  syncingFromYamlRef: React.MutableRefObject<boolean>,
  lastSyncedYamlDefaultRef: React.MutableRefObject<Record<string, string>>
) => {
  useEffect(() => {
    const fieldsToSync: Array<{ path: string; name: string; yamlDefault: string }> = [];

    for (const field of parsedFields) {
      const yamlDefault = getYamlDefaultAsString(field.metadata?.default);
      const lastSynced = lastSyncedYamlDefaultRef.current[field.name];
      const fieldPath = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(field.name, field.type)}`;

      if (lastSynced === undefined || lastSynced !== yamlDefault) {
        fieldsToSync.push({ path: fieldPath, name: field.name, yamlDefault });
      }
    }

    if (fieldsToSync.length === 0) return;

    syncingFromYamlRef.current = true;
    for (const { path, name, yamlDefault } of fieldsToSync) {
      lastSyncedYamlDefaultRef.current[name] = yamlDefault;
      form.setFieldValue(path, yamlDefault);
    }

    setTimeout(() => {
      syncingFromYamlRef.current = false;
    }, 0);
  }, [parsedFields, form, syncingFromYamlRef, lastSyncedYamlDefaultRef]);
};

const serializeFormValue = (rawValue: unknown): string => {
  if (rawValue instanceof Date) return rawValue.toISOString();
  if (moment.isMoment(rawValue)) return rawValue.utc().toISOString();
  if (Array.isArray(rawValue)) return JSON.stringify(rawValue);
  return String(rawValue ?? '');
};

export const useFormToYamlSync = (
  form: FormHook,
  parsedFields: FieldInfo[],
  syncingFromYamlRef: React.MutableRefObject<boolean>,
  yamlDefaultsRef: React.MutableRefObject<Record<string, string>>,
  onFieldDefaultChange?: OnFieldDefaultChange
) => {
  const onFieldDefaultChangeRef = useRef(onFieldDefaultChange);
  onFieldDefaultChangeRef.current = onFieldDefaultChange;

  useEffect(() => {
    const subscription = form.subscribe(({ data }) => {
      if (syncingFromYamlRef.current) {
        return;
      }

      const extendedFields = (data.internal as Record<string, Record<string, unknown>>)?.[
        CASE_EXTENDED_FIELDS
      ];
      if (!extendedFields) return;

      for (const field of parsedFields) {
        const fieldKey = getFieldSnakeKey(field.name, field.type);
        const rawValue = extendedFields[fieldKey];
        const currentFormValue = serializeFormValue(rawValue);
        const currentYamlValue = yamlDefaultsRef.current[field.name] ?? '';

        if (currentFormValue !== currentYamlValue) {
          onFieldDefaultChangeRef.current?.(field.name, currentFormValue, field.control);
        }
      }
    });

    return subscription.unsubscribe;
  }, [form, parsedFields, syncingFromYamlRef, yamlDefaultsRef]);
};

/**
 * Bidirectional sync between form field values and YAML metadata.default values.
 *
 * - When YAML changes (parsedFields updates), form fields are updated
 * - When form fields change (user input), onFieldDefaultChange callback is called
 * - Prevents feedback loops by tracking synced values
 */
export const useYamlFormSync = (
  form: FormHook,
  parsedFields: FieldInfo[],
  onFieldDefaultChange?: OnFieldDefaultChange
) => {
  const yamlDefaultsRef = useRef<Record<string, string>>({});
  const lastSyncedYamlDefaultRef = useRef<Record<string, string>>({});
  const syncingFromYamlRef = useRef(false);

  const currentYamlDefaults: Record<string, string> = {};
  for (const field of parsedFields) {
    currentYamlDefaults[field.name] = getYamlDefaultAsString(field.metadata?.default);
  }
  yamlDefaultsRef.current = currentYamlDefaults;

  useYamlToFormSync(form, parsedFields, syncingFromYamlRef, lastSyncedYamlDefaultRef);
  useFormToYamlSync(form, parsedFields, syncingFromYamlRef, yamlDefaultsRef, onFieldDefaultChange);

  return { yamlDefaults: yamlDefaultsRef.current };
};
