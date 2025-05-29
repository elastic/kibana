/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { BehaviorSubject } from 'rxjs';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY,
  LAST_SELECTED_CONVERSATION_LOCAL_STORAGE_KEY,
} from '../../assistant_context/constants';
import { SelectedConversation } from '../../assistant_context';
export interface LastConversation {
  id: string;
  title?: string;
}

const lastConversationSubject$ = new BehaviorSubject<LastConversation | null>(null);
const localStorageLastConversationIdSubject$ = new BehaviorSubject<string | null>(null);
export const useAssistantLastConversation = ({
  nameSpace = DEFAULT_ASSISTANT_NAMESPACE,
  spaceId,
}: {
  nameSpace?: string;
  spaceId: string;
}): {
  getLastConversation: (selectedConversation?: SelectedConversation) => LastConversation;
  setLastConversation: (lastConversation: LastConversation) => void;
} => {
  // Legacy fallback: used only if the new storage value is not yet set
  const [localStorageLastConversationId] = useLocalStorage<string>(
    `${nameSpace}.${LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY}.${spaceId}`
  );

  const [localStorageLastConversation, setLocalStorageLastConversation] =
    useLocalStorage<LastConversation>(
      `${nameSpace}.${LAST_SELECTED_CONVERSATION_LOCAL_STORAGE_KEY}.${spaceId}`
    );

  // Sync BehaviorSubject when localStorage changes
  useEffect(() => {
    if (lastConversationSubject$.getValue() !== localStorageLastConversation) {
      lastConversationSubject$.next(localStorageLastConversation || null);
    }

    if (localStorageLastConversationIdSubject$.getValue() !== localStorageLastConversationId) {
      localStorageLastConversationIdSubject$.next(localStorageLastConversationId || null);
    }
  }, [localStorageLastConversation, localStorageLastConversationId]);

  const getLastConversation = useCallback(
    (selectedConversation?: SelectedConversation): LastConversation => {
      let nextConversation: LastConversation = { id: '' };
      const localStorageLastConversationValue = lastConversationSubject$.getValue();
      const localStorageLastConversationIdValue = localStorageLastConversationIdSubject$.getValue();

      // Type guard to check if selectedConversation has a 'title'
      if (selectedConversation && 'title' in selectedConversation) {
        nextConversation = {
          id: '',
          title: selectedConversation.title,
        };

        return nextConversation;
      }

      // If selectedConversation exists and has an 'id', return it with no 'title'
      if (selectedConversation && 'id' in selectedConversation) {
        nextConversation = { id: selectedConversation.id };
        return nextConversation;
      }

      // Check if localStorageLastConversation has a 'title'
      if (localStorageLastConversationValue && 'title' in localStorageLastConversationValue) {
        nextConversation = {
          id: '',
          title: localStorageLastConversationValue.title,
        };
        return nextConversation;
      }

      // If localStorageLastConversation, return it
      if (localStorageLastConversationValue && 'id' in localStorageLastConversationValue) {
        nextConversation = localStorageLastConversationValue;
        return nextConversation;
      }

      // If localStorageLastConversationId exists, use it as 'id'
      if (localStorageLastConversationIdValue) {
        nextConversation = { id: localStorageLastConversationIdValue };
        return nextConversation;
      }

      // Default to an empty 'id'
      return nextConversation;
    },
    []
  );

  const setLastConversation = useCallback(
    (newConversation: LastConversation) => {
      setLocalStorageLastConversation(newConversation); // Save to localStorage
      lastConversationSubject$.next(newConversation); // Emit latest value
    },
    [setLocalStorageLastConversation]
  );

  return useMemo(
    () => ({ getLastConversation, setLastConversation }),
    [getLastConversation, setLastConversation]
  );
};
