/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { EuiCheckbox } from '@elastic/eui';
import { ConversationTableItem } from './types';

export const PageSelectionCheckbox = ({
  conversationOptionsIds,
  deletedConversationsIds,
  excludedIds,
  handlePageChecked,
  handlePageUnchecked,
  isDeleteAll,
  isExcludedMode,
}: {
  conversationOptionsIds: string[];
  deletedConversationsIds: string[];
  excludedIds: string[];
  handlePageChecked: () => void;
  handlePageUnchecked: () => void;
  isDeleteAll: boolean;
  isExcludedMode: boolean;
}) => {
  const [pageSelectionChecked, setPageSelectionChecked] = useState(
    (!isExcludedMode &&
      (isDeleteAll ||
        conversationOptionsIds.every((id) => deletedConversationsIds.includes(id)))) ||
      (isExcludedMode && !excludedIds.some((id) => conversationOptionsIds.includes(id)))
  );

  useEffect(() => {
    setPageSelectionChecked(
      (!isExcludedMode &&
        (isDeleteAll ||
          conversationOptionsIds.every((id) => deletedConversationsIds.includes(id)))) ||
        (isExcludedMode && !excludedIds.some((id) => conversationOptionsIds.includes(id)))
    );
  }, [isDeleteAll, deletedConversationsIds, conversationOptionsIds, excludedIds, isExcludedMode]);

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
          handlePageChecked();
        } else {
          setPageSelectionChecked(false);
          handlePageUnchecked();
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
  isDeleteAll,
}: {
  conversation: ConversationTableItem;
  deletedConversationsIds: string[];
  excludedIds: string[];
  isExcludedMode: boolean;
  handleRowChecked: (conversation: ConversationTableItem) => void;
  handleRowUnChecked: (conversation: ConversationTableItem) => void;
  isDeleteAll: boolean;
}) => {
  const [checked, setChecked] = useState(
    (!isExcludedMode && (isDeleteAll || deletedConversationsIds.includes(conversation.id))) ||
      (isExcludedMode && !excludedIds.includes(conversation.id))
  );

  useEffect(() => {
    setChecked(
      (!isExcludedMode && (isDeleteAll || deletedConversationsIds.includes(conversation.id))) ||
        (isExcludedMode && !excludedIds.includes(conversation.id))
    );
  }, [isDeleteAll, deletedConversationsIds, conversation.id, excludedIds, isExcludedMode]);

  return (
    <EuiCheckbox
      data-test-subj={`conversationSelect-${conversation.id}`}
      id={`conversationSelect-${conversation.id}`}
      checked={checked}
      onChange={(e) => {
        if (e.target.checked) {
          setChecked(true);
          handleRowChecked(conversation);
        } else {
          setChecked(false);
          handleRowUnChecked(conversation);
        }
      }}
    />
  );
};
