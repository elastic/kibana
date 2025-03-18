/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY,
  LAST_SELECTED_CONVERSATION_LOCAL_STORAGE_KEY,
} from '../../assistant_context/constants';
import { LastConversation, SelectedConversation } from '../../assistant_context';

interface UseSpaceIdContext {
  spaceId: string;
}
interface SpaceIdProviderProps extends UseSpaceIdContext {
  children: React.ReactNode;
}

const SpaceIdContext = React.createContext<UseSpaceIdContext | undefined>(undefined);

export const AssistantSpaceIdProvider: React.FC<SpaceIdProviderProps> = ({ children, spaceId }) => {
  return <SpaceIdContext.Provider value={{ spaceId }}>{children}</SpaceIdContext.Provider>;
};

export const useAssistantSpaceId = () => {
  const context = React.useContext(SpaceIdContext);
  if (context === undefined) {
    throw new Error('useSpaceId must be used within a AssistantSpaceIdProvider');
  }
  return context.spaceId;
};

export const useAssistantLastConversation = ({
  nameSpace = DEFAULT_ASSISTANT_NAMESPACE,
  spaceId,
}: {
  nameSpace?: string;
  spaceId: string;
}): {
  getLastConversation: (selectedConversation?: SelectedConversation) => LastConversation;
  setLastConversation: React.Dispatch<React.SetStateAction<LastConversation | undefined>>;
} => {
  // Legacy fallback: used only if the new storage value is not yet set
  const [localStorageLastConversationId] = useLocalStorage<string>(
    `${nameSpace}.${LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY}.${spaceId}`
  );

  const [localStorageLastConversation, setLocalStorageLastConversation] =
    useLocalStorage<LastConversation>(
      `${nameSpace}.${LAST_SELECTED_CONVERSATION_LOCAL_STORAGE_KEY}.${spaceId}`
    );

  const getLastConversation = useCallback(
    (selectedConversation?: SelectedConversation): LastConversation => {
      let nextConversation: LastConversation = { id: '' };
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
      if (localStorageLastConversation && 'title' in localStorageLastConversation) {
        nextConversation = {
          id: '',
          title: localStorageLastConversation.title,
        };
        return nextConversation;
      }

      // If localStorageLastConversation, return it
      if (localStorageLastConversation && 'id' in localStorageLastConversation) {
        nextConversation = localStorageLastConversation;
        return nextConversation;
      }

      // If localStorageLastConversationId exists, use it as 'id'
      if (localStorageLastConversationId) {
        nextConversation = { id: localStorageLastConversationId };
        return nextConversation;
      }

      // Default to an empty 'id'
      return nextConversation;
    },
    [localStorageLastConversation, localStorageLastConversationId]
  );

  return {
    getLastConversation,
    setLastConversation: setLocalStorageLastConversation,
  };
};
