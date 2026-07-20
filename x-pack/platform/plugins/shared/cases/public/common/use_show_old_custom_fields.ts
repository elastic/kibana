/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOCAL_STORAGE_KEYS } from '../../common/constants';
import { useCasesLocalStorage } from './use_cases_local_storage';

/**
 * Local-storage-backed switch that gates visibility of legacy (pre-migration)
 * custom fields and templates across Settings, Create Case, and Case Details.
 * Defaults to OFF. Scoped per owner via `useCasesLocalStorage`.
 */
export const useShowLegacyCustomFields = (): {
  showLegacyCustomFields: boolean;
  setShowLegacyCustomFields: (value: boolean | ((prev: boolean) => boolean)) => void;
} => {
  const [showLegacyCustomFields, setShowLegacyCustomFields] = useCasesLocalStorage<boolean>(
    LOCAL_STORAGE_KEYS.showLegacyCustomFields,
    false
  );

  return { showLegacyCustomFields, setShowLegacyCustomFields };
};
