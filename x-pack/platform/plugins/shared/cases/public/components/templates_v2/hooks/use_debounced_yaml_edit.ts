/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LOCAL_STORAGE_KEYS } from '../../../../common/constants';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';
import { exampleTemplateDefinition } from '../field_types/constants';

const DEBOUNCE_DELAY_MS = 300;
const SAVED_INDICATOR_DURATION_MS = 1000;

export const useDebouncedYamlEdit = (onChangeCallback: (value: string) => void) => {
  const [value, setValue] = useCasesLocalStorage<string>(
    LOCAL_STORAGE_KEYS.templatesYamlEditorState,
    exampleTemplateDefinition
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = useCallback(
    (newValue: string) => {
      setValue(newValue);
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
    [setValue, onChangeCallback]
  );

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
    isSaving,
    isSaved,
  };
};
