/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { ConversationTableItem } from './types';

const EMPTY_CONVERSATIONS_ARRAY: ConversationTableItem[] = [];
const EMPTY_CONVERSATIONS_IDS_ARRAY: string[] = [];

export const useConversationSelection = () => {
  const [isDeleteAll, setIsDeleteAll] = useState(false);
  const [isExcludedMode, setIsExcludedMode] = useState(false);
  const [deletedConversations, setDeletedConversations] = useState(EMPTY_CONVERSATIONS_ARRAY);
  const [totalSelectedConversations, setTotalSelectedConversations] = useState(0);
  const [excludedIds, setExcludedIds] = useState<string[]>(EMPTY_CONVERSATIONS_IDS_ARRAY);

  const handleUnselectAll = useCallback(() => {
    setIsDeleteAll(false);
    setIsExcludedMode(false);
    setDeletedConversations([]);
    setTotalSelectedConversations(0);
    setExcludedIds([]);
  }, []);

  const handleSelectAll = useCallback((totalItemCount: number) => {
    setIsDeleteAll(true);
    setIsExcludedMode(true);
    setTotalSelectedConversations(totalItemCount);
    setExcludedIds([]);
  }, []);

  const handlePageChecked = useCallback(
    ({
      conversationOptions,
      totalItemCount,
    }: {
      conversationOptions: ConversationTableItem[];
      totalItemCount: number;
    }) => {
      const conversationOptionsIds = conversationOptions.map((item) => item.id);
      const deletedConversationsIds = deletedConversations.map((item) => item.id);
      if (isExcludedMode) {
        const newExcludedIds = excludedIds.filter((item) => !conversationOptionsIds.includes(item));
        setExcludedIds(newExcludedIds);
        setTotalSelectedConversations(
          (prev) => prev + conversationOptionsIds.filter((id) => excludedIds.includes(id)).length
        );
      } else {
        const newDeletedConversations = conversationOptions.reduce(
          (acc, curr) => {
            if (!deletedConversationsIds.includes(curr.id)) {
              acc.push(curr);
            }
            return acc;
          },
          [...deletedConversations]
        );
        setDeletedConversations(newDeletedConversations);
        setTotalSelectedConversations(
          (prev) =>
            prev +
            conversationOptionsIds.filter((id) => !deletedConversationsIds.includes(id)).length
        );
        if (newDeletedConversations.length === totalItemCount) {
          setIsDeleteAll(true);
          setIsExcludedMode(true);
        }
      }
    },
    [deletedConversations, excludedIds, isExcludedMode]
  );

  const handlePageUnchecked = useCallback(
    ({
      conversationOptionsIds,
      totalItemCount,
    }: {
      conversationOptionsIds: string[];
      totalItemCount: number;
    }) => {
      if (isExcludedMode) {
        setExcludedIds((prev) => [...prev, ...conversationOptionsIds]);
      }
      setDeletedConversations(
        deletedConversations.filter((item) => !conversationOptionsIds.includes(item.id))
      );
      setTotalSelectedConversations(
        (prev) => (prev || totalItemCount) - conversationOptionsIds.length
      );

      setIsDeleteAll(false);
    },
    [deletedConversations, isExcludedMode]
  );

  const handleRowChecked = useCallback(
    ({
      selectedItem,
      totalItemCount,
    }: {
      selectedItem: ConversationTableItem;
      totalItemCount: number;
    }) => {
      if (isExcludedMode) {
        const newExcludedIds = excludedIds.filter((item) => item !== selectedItem.id);
        setExcludedIds(newExcludedIds);
      } else {
        const newDeletedConversations = [...deletedConversations, selectedItem];
        setDeletedConversations(newDeletedConversations);
        if (newDeletedConversations.length === totalItemCount) {
          setIsDeleteAll(true);
          setIsExcludedMode(true);
        }
      }
      setTotalSelectedConversations((prev) => prev + 1);
    },
    [deletedConversations, excludedIds, isExcludedMode]
  );

  const handleRowUnChecked = useCallback(
    ({
      selectedItem,
      totalItemCount,
    }: {
      selectedItem: ConversationTableItem;
      totalItemCount: number;
    }) => {
      if (isExcludedMode) {
        setExcludedIds((prev) => [...prev, selectedItem.id]);
      }
      setDeletedConversations((prev) => prev.filter((item) => item.id !== selectedItem.id));
      setIsDeleteAll(false);
      setTotalSelectedConversations((prev) => (prev || totalItemCount) - 1);
    },
    [isExcludedMode]
  );

  return {
    selectionState: {
      isDeleteAll,
      isExcludedMode,
      deletedConversations,
      totalSelectedConversations,
      excludedIds,
    },
    selectionActions: {
      handleUnselectAll,
      handleSelectAll,
      handlePageUnchecked,
      handlePageChecked,
      handleRowUnChecked,
      handleRowChecked,
      setDeletedConversations,
      setExcludedIds,
      setIsDeleteAll,
      setIsExcludedMode,
      setTotalSelectedConversations,
    },
  };
};
