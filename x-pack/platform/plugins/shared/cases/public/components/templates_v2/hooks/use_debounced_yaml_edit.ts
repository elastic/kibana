/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';

const DEBOUNCE_DELAY_MS = 300;
const SAVED_INDICATOR_DURATION_MS = 1000;

interface EditStateWithId {
  templateId?: string;
  definition: string;
}

export const useDebouncedYamlEdit = (
  storageKey: string,
  initialValue: string,
  onChangeCallback: (value: string) => void,
  templateId?: string
) => {
  const [storedState, setStoredState] = useCasesLocalStorage<string | EditStateWithId>(
    storageKey,
    templateId ? { templateId, definition: initialValue } : initialValue
  );
  const valueFromStorage = typeof storedState === 'string' ? storedState : storedState?.definition;
  const shouldUseStoredValue =
    typeof storedState === 'string' || storedState?.templateId === templateId;
  const value = shouldUseStoredValue ? valueFromStorage : initialValue;

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prevInitialValueRef = useRef(initialValue);
  const onChangeCallbackRef = useRef(onChangeCallback);
  onChangeCallbackRef.current = onChangeCallback;

  if (prevInitialValueRef.current !== initialValue) {
    prevInitialValueRef.current = initialValue;
    const freshState = templateId ? { templateId, definition: initialValue } : initialValue;
    setStoredState(freshState);
  }

  const valueForForm = value ?? '';
  const lastNotifiedValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastNotifiedValueRef.current !== valueForForm) {
      onChangeCallbackRef.current(valueForForm);
      lastNotifiedValueRef.current = valueForForm;
    }
  }, [valueForForm]);

  const handleSave = useCallback(
    (newValue: string) => {
      const stateToSave = templateId ? { templateId, definition: newValue } : newValue;
      setStoredState(stateToSave);
      onChangeCallbackRef.current(newValue);
      lastNotifiedValueRef.current = newValue;
      setIsSaving(false);
      setIsSaved(true);

      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }

      savedTimeoutRef.current = setTimeout(() => {
        setIsSaved(false);
      }, SAVED_INDICATOR_DURATION_MS);
    },
    [setStoredState, templateId]
  );

  const handleReset = useCallback(() => {
    const stateToSave = templateId ? { templateId, definition: initialValue } : initialValue;
    setStoredState(stateToSave);
    onChangeCallbackRef.current(initialValue);
    lastNotifiedValueRef.current = initialValue;
  }, [setStoredState, initialValue, templateId]);

  const debouncedSave = useRef(debounce(handleSave, DEBOUNCE_DELAY_MS));

  const clearDraft = useCallback(
    (savedValue?: string) => {
      debouncedSave.current.cancel();
      const definition = savedValue ?? initialValue;
      const stateToSave = templateId ? { templateId, definition } : definition;
      setStoredState(stateToSave);
      prevInitialValueRef.current = definition;
    },
    [setStoredState, initialValue, templateId]
  );

  useEffect(() => {
    const debounced = debounce(handleSave, DEBOUNCE_DELAY_MS);
    debouncedSave.current = debounced;

    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      debounced.flush();
    };
  }, [handleSave]);

  const onChange = useCallback((newValue: string) => {
    setIsSaving(true);
    setIsSaved(false);
    debouncedSave.current(newValue);
  }, []);

  return {
    value,
    onChange,
    handleReset,
    clearDraft,
    isSaving,
    isSaved,
  };
};
