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
  handlePageChecked,
  handlePageUnchecked,
  isDeleteAll,
}: {
  conversationOptionsIds: string[];
  deletedConversationsIds: string[];
  handlePageChecked: () => void;
  handlePageUnchecked: () => void;
  isDeleteAll: boolean;
}) => {
  const [pageSelectionChecked, setPageSelectionChecked] = useState(
    isDeleteAll || conversationOptionsIds.every((id) => deletedConversationsIds.includes(id))
  );

  useEffect(() => {
    setPageSelectionChecked(
      isDeleteAll || conversationOptionsIds.every((id) => deletedConversationsIds.includes(id))
    );
  }, [isDeleteAll, deletedConversationsIds, conversationOptionsIds]);

  if (conversationOptionsIds.length === 0) {
    return null;
  }

  return (
    <EuiCheckbox
      data-test-subj={`conversationPageSelect`}
      id={`conversationPageSelect`}
      checked={pageSelectionChecked}
      disabled={isDeleteAll}
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
  handleRowChecked,
  handleRowUnChecked,
  isDeleteAll,
}: {
  conversation: ConversationTableItem;
  deletedConversationsIds: string[];
  handleRowChecked: (conversation: ConversationTableItem) => void;
  handleRowUnChecked: (conversation: ConversationTableItem) => void;
  isDeleteAll: boolean;
}) => {
  const [checked, setChecked] = useState(
    isDeleteAll || deletedConversationsIds.includes(conversation.id)
  );

  useEffect(() => {
    setChecked(isDeleteAll || deletedConversationsIds.includes(conversation.id));
  }, [isDeleteAll, deletedConversationsIds, conversation.id]);

  return (
    <EuiCheckbox
      data-test-subj={`conversationSelect-${conversation.id}`}
      id={`conversationSelect-${conversation.id}`}
      checked={checked}
      disabled={isDeleteAll}
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
