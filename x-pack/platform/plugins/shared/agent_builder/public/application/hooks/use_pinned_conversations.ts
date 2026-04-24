/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { storageKeys } from '../storage_keys';

type PinnedConversationsStorage = Record<string, { isPinned: boolean }>;

export const usePinnedConversations = () => {
  const [storage, setStorage] = useLocalStorage<PinnedConversationsStorage>(
    storageKeys.pinnedConversations,
    {}
  );

  const isPinned = (id: string) => storage?.[id]?.isPinned === true;

  const pinConversation = (id: string) => setStorage({ ...storage, [id]: { isPinned: true } });

  const unpinConversation = (id: string) => setStorage({ ...storage, [id]: { isPinned: false } });

  return { isPinned, pinConversation, unpinConversation };
};
