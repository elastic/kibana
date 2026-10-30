/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { isEmpty } from 'lodash';
import useDebounce from 'react-use/lib/useDebounce';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { MarkdownValueControl } from './types';

const STORAGE_DEBOUNCE_TIME = 500;

export interface SessionStorageType {
  field: MarkdownValueControl;
  sessionKey: string;
  initialValue: string | undefined;
}

export const useMarkdownSessionStorage = ({
  field,
  sessionKey,
  initialValue,
}: SessionStorageType) => {
  const [hasConflicts, setHasConflicts] = useState<boolean>(false);
  const initialValueRef = useRef(initialValue);

  const [sessionValue, setSessionValue] = useSessionStorage(sessionKey, '', true);

  // Restored after mount, not during render or in the first effect pass: react-hook-form only
  // subscribes to field changes in effects that run after this component's own.
  const [isMounted, setIsMounted] = useState(false);
  const restoreDraft = useRef(() => {
    if (!isEmpty(sessionValue) && !isEmpty(sessionKey)) {
      field.setValue(sessionValue);
    }
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      restoreDraft.current();
      restoreDraft.current = () => {};
    }
  }, [isMounted]);

  if (initialValue !== initialValueRef.current && initialValue !== field.value) {
    initialValueRef.current = initialValue;
    setHasConflicts(true);
  }

  useDebounce(
    () => {
      if (!isEmpty(sessionKey)) {
        setSessionValue(field.value);
      }
    },
    STORAGE_DEBOUNCE_TIME,
    [field.value]
  );

  return { hasConflicts };
};
