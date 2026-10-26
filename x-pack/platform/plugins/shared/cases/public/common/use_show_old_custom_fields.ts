/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { LOCAL_STORAGE_KEYS } from '../../common/constants';
import { useCasesLocalStorage } from './use_cases_local_storage';

interface LegacyCustomFieldLike {
  required: boolean;
  defaultValue?: string | number | boolean | null;
}

/**
 * Required legacy custom fields without a configured default must remain visible
 * on create (server rejects the case otherwise). Matches
 * `validateRequiredCustomFields` in server/client/cases/validators.ts.
 */
export const hasRequiredCustomFieldsWithoutDefault = (
  customFields: readonly LegacyCustomFieldLike[]
): boolean =>
  customFields.some(
    (field) => field.required && (field.defaultValue === undefined || field.defaultValue === null)
  );

/**
 * Local-storage-backed switch that gates visibility of legacy (pre-migration)
 * custom fields and templates across Settings, Create Case, and Case Details.
 * Defaults to OFF. Scoped per owner via `useCasesLocalStorage`.
 *
 * When `customFields` includes required fields without defaults, the switch is
 * forced ON and cannot be turned off until those fields are fixed.
 */
export const useShowLegacyCustomFields = (
  customFields: readonly LegacyCustomFieldLike[] = []
): {
  showLegacyCustomFields: boolean;
  setShowLegacyCustomFields: (value: boolean | ((prev: boolean) => boolean)) => void;
  canDisableSwitch: boolean;
} => {
  const [storedValue, setStoredValue] = useCasesLocalStorage<boolean>(
    LOCAL_STORAGE_KEYS.showLegacyCustomFields,
    false
  );

  const mustShow = hasRequiredCustomFieldsWithoutDefault(customFields);
  const showLegacyCustomFields = mustShow || storedValue;

  const setShowLegacyCustomFields = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof value === 'function' ? value(storedValue) : value;
      if (mustShow && !resolved) {
        return;
      }
      setStoredValue(resolved);
    },
    [mustShow, setStoredValue, storedValue]
  );

  return {
    showLegacyCustomFields,
    setShowLegacyCustomFields,
    canDisableSwitch: !mustShow,
  };
};
