/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
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
  const syncingFromYamlRef = useRef(false);
  const onFieldDefaultChangeRef = useRef(onFieldDefaultChange);
  onFieldDefaultChangeRef.current = onFieldDefaultChange;

  // Update yamlDefaultsRef synchronously during render to avoid race conditions
  const currentYamlDefaults: Record<string, string> = {};
  for (const field of parsedFields) {
    currentYamlDefaults[field.name] = getYamlDefaultAsString(field.metadata?.default);
  }
  yamlDefaultsRef.current = currentYamlDefaults;

  // Sync YAML defaults to form fields
  useEffect(() => {
    syncingFromYamlRef.current = true;

    for (const field of parsedFields) {
      const yamlDefault = getYamlDefaultAsString(field.metadata?.default);
      const fieldPath = `${CASE_EXTENDED_FIELDS}.${field.name}_as_${field.type}`;
      form.setFieldValue(fieldPath, yamlDefault);
    }

    // Reset the flag after all subscription callbacks triggered by setFieldValue have been processed
    setTimeout(() => {
      syncingFromYamlRef.current = false;
    }, 0);
  }, [parsedFields, form]);

  // Subscribe to form changes and propagate to YAML
  useEffect(() => {
    const subscription = form.subscribe(({ data }) => {
      // Skip if we're syncing from YAML to avoid feedback loop
      if (syncingFromYamlRef.current) {
        return;
      }

      const extendedFields = (data.internal as Record<string, Record<string, string>>)?.[
        CASE_EXTENDED_FIELDS
      ];
      if (!extendedFields) return;

      for (const field of parsedFields) {
        const fieldKey = `${field.name}_as_${field.type}`;
        const currentFormValue = String(extendedFields[fieldKey] ?? '');
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
