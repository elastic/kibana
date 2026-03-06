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
  // For edit mode with templateId, store { templateId, definition }
  // For create mode (no templateId), store just the string
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

  const initialValueRef = useRef(value);
  const onChangeCallbackRef = useRef(onChangeCallback);

  useEffect(() => {
    onChangeCallbackRef.current(initialValueRef.current);
  }, []);

  const handleSave = useCallback(
    (newValue: string) => {
      const stateToSave = templateId ? { templateId, definition: newValue } : newValue;
      setStoredState(stateToSave);
      onChangeCallback(newValue);
      setIsSaving(false);
      setIsSaved(true);

      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }

      savedTimeoutRef.current = setTimeout(() => {
        setIsSaved(false);
      }, SAVED_INDICATOR_DURATION_MS);
    },
    [setStoredState, onChangeCallback, templateId]
  );

  const handleReset = useCallback(() => {
    const stateToSave = templateId ? { templateId, definition: initialValue } : initialValue;
    setStoredState(stateToSave);
    onChangeCallback(initialValue);
  }, [setStoredState, onChangeCallback, initialValue, templateId]);

  const debouncedSave = useRef(debounce(handleSave, DEBOUNCE_DELAY_MS));

  useEffect(() => {
    debouncedSave.current = debounce(handleSave, DEBOUNCE_DELAY_MS);
  }, [handleSave]);

  const onChange = useCallback((newValue: string) => {
    setIsSaving(true);
    setIsSaved(false);
    debouncedSave.current(newValue);
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      debouncedSave.current.flush();
      debouncedSave.current.cancel();
    };
  }, []);

  return {
    value,
    onChange,
    handleReset,
    isSaving,
    isSaved,
  };
};
