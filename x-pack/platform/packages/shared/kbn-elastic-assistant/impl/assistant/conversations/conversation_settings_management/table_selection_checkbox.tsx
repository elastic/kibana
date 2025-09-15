/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { EuiCheckbox } from '@elastic/eui';
import {
  ConversationTableItem,
  HandlePageChecked,
  HandlePageUnchecked,
  HandleRowChecked,
  HandleRowUnChecked,
} from './types';

export const PageSelectionCheckbox = ({
  conversationOptions,
  deletedConversationsIds,
  excludedIds,
  handlePageChecked,
  handlePageUnchecked,
  isExcludedMode,
  totalItemCount,
}: {
  conversationOptions: ConversationTableItem[];
  deletedConversationsIds: string[];
  excludedIds: string[];
  handlePageChecked: HandlePageChecked;
  handlePageUnchecked: HandlePageUnchecked;
  isExcludedMode: boolean;
  totalItemCount: number;
}) => {
  const conversationOptionsIds = useMemo(
    () => conversationOptions.map((item) => item.id),
    [conversationOptions]
  );
  const [pageSelectionChecked, setPageSelectionChecked] = useState(
    (!isExcludedMode &&
      conversationOptionsIds.every((id) => deletedConversationsIds.includes(id))) ||
      (isExcludedMode && !excludedIds.some((id) => conversationOptionsIds.includes(id)))
  );

  useEffect(() => {
    setPageSelectionChecked(
      (!isExcludedMode &&
        conversationOptionsIds.every((id) => deletedConversationsIds.includes(id))) ||
        (isExcludedMode && !excludedIds.some((id) => conversationOptionsIds.includes(id)))
    );
  }, [deletedConversationsIds, conversationOptionsIds, excludedIds, isExcludedMode]);

  if (conversationOptionsIds.length === 0) {
    return null;
  }

  return (
    <EuiCheckbox
      data-test-subj={`conversationPageSelect`}
      id={`conversationPageSelect`}
      checked={pageSelectionChecked}
      onChange={(e) => {
        if (e.target.checked) {
          setPageSelectionChecked(true);
          handlePageChecked({ conversationOptions, totalItemCount });
        } else {
          setPageSelectionChecked(false);
          handlePageUnchecked({ conversationOptionsIds, totalItemCount });
        }
      }}
    />
  );
};

export const InputCheckbox = ({
  conversation,
  deletedConversationsIds,
  excludedIds,
  isExcludedMode,
  handleRowChecked,
  handleRowUnChecked,
  totalItemCount,
}: {
  conversation: ConversationTableItem;
  deletedConversationsIds: string[];
  excludedIds: string[];
  isExcludedMode: boolean;
  handleRowChecked: HandleRowChecked;
  handleRowUnChecked: HandleRowUnChecked;
  totalItemCount: number;
}) => {
  const [checked, setChecked] = useState(
    (!isExcludedMode && deletedConversationsIds.includes(conversation.id)) ||
      (isExcludedMode && !excludedIds.includes(conversation.id))
  );

  useEffect(() => {
    setChecked(
      (!isExcludedMode && deletedConversationsIds.includes(conversation.id)) ||
        (isExcludedMode && !excludedIds.includes(conversation.id))
    );
  }, [deletedConversationsIds, conversation.id, excludedIds, isExcludedMode]);

  return (
    <EuiCheckbox
      data-test-subj={`conversationSelect-${conversation.id}`}
      id={`conversationSelect-${conversation.id}`}
      checked={checked}
      onChange={(e) => {
        if (e.target.checked) {
          setChecked(true);
          handleRowChecked({ selectedItem: conversation, totalItemCount });
        } else {
          setChecked(false);
          handleRowUnChecked({ selectedItem: conversation, totalItemCount });
        }
      }}
    />
  );
};
