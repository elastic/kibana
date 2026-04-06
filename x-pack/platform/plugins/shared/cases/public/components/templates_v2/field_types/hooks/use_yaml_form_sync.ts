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
import { getYamlDefaultAsString } from '../../utils';

interface FieldInfo {
  name: string;
  type: string;
  control: string;
  metadata?: {
    default?: unknown;
    [key: string]: unknown;
  };
}

type OnFieldDefaultChange = (fieldName: string, value: string, control: string) => void;

/**
 * Hook that syncs form field values with YAML metadata.default values bidirectionally.
 *
 * - When YAML changes (parsedFields updates), form fields are updated only if the YAML
 *   default for that field actually changed (content-based), not just because parsedFields
 *   is a new array reference.
 * - When form fields change (user input), onFieldDefaultChange callback is called.
 * - Prevents feedback loops: a YAML sync never overwrites a user's UI selection unless
 *   the YAML author explicitly changed the default to a different value.
 */
export const useYamlFormSync = (
  form: FormHook,
  parsedFields: FieldInfo[],
  onFieldDefaultChange?: OnFieldDefaultChange
) => {
  const yamlDefaultsRef = useRef<Record<string, string>>({});
  // Tracks the last YAML default we actually pushed into the form per field.
  // We only call setFieldValue when the YAML default for a field genuinely changes.
  const lastSyncedYamlDefaultRef = useRef<Record<string, string>>({});
  const onFieldDefaultChangeRef = useRef(onFieldDefaultChange);
  onFieldDefaultChangeRef.current = onFieldDefaultChange;

  // Update yamlDefaultsRef synchronously during render to avoid race conditions
  const currentYamlDefaults: Record<string, string> = {};
  for (const field of parsedFields) {
    currentYamlDefaults[field.name] = getYamlDefaultAsString(field.metadata?.default);
  }
  yamlDefaultsRef.current = currentYamlDefaults;

  // Sync YAML defaults to form fields — only when a field's default genuinely changes.
  useEffect(() => {
    const fieldsToSync: Array<{ path: string; name: string; yamlDefault: string }> = [];

    for (const field of parsedFields) {
      const yamlDefault = getYamlDefaultAsString(field.metadata?.default);
      const lastSynced = lastSyncedYamlDefaultRef.current[field.name];
      const fieldPath = `${CASE_EXTENDED_FIELDS}.${field.name}_as_${field.type}`;

      // Only push to the form if this is a new field (never synced) OR the YAML default
      // for this field has genuinely changed since the last sync.
      if (lastSynced === undefined || lastSynced !== yamlDefault) {
        fieldsToSync.push({ path: fieldPath, name: field.name, yamlDefault });
      }
    }

    if (fieldsToSync.length === 0) return;

    for (const { path, name, yamlDefault } of fieldsToSync) {
      lastSyncedYamlDefaultRef.current[name] = yamlDefault;
      form.setFieldValue(path, yamlDefault);
    }
  }, [parsedFields, form]);

  // Subscribe to form changes and propagate to YAML
  useEffect(() => {
    const subscription = form.subscribe(({ data }) => {
      const extendedFields = (data.internal as Record<string, Record<string, unknown>>)?.[
        CASE_EXTENDED_FIELDS
      ];
      if (!extendedFields) return;

      for (const field of parsedFields) {
        const fieldKey = `${field.name}_as_${field.type}`;
        const rawValue = extendedFields[fieldKey];
        const currentFormValue =
          rawValue instanceof Date
            ? rawValue.toISOString()
            : moment.isMoment(rawValue)
            ? rawValue.utc().toISOString()
            : Array.isArray(rawValue)
            ? JSON.stringify(rawValue)
            : String(rawValue ?? '');
        const currentYamlValue = yamlDefaultsRef.current[field.name] ?? '';

        if (currentFormValue !== currentYamlValue) {
          onFieldDefaultChangeRef.current?.(field.name, currentFormValue, field.control);
        }
      }
    });

    return subscription.unsubscribe;
  }, [form, parsedFields]);

  return { yamlDefaults: yamlDefaultsRef.current };
};
