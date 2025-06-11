/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { EuiCheckbox } from '@elastic/eui';

export const PageSelectionCheckbox = ({
  conversationOptionsIds,
  deletedConversationsIds,
  handlePageSelection,
  handlePageUnselecting,
  isSelectedAll,
}: {
  conversationOptionsIds: string[];
  deletedConversationsIds: string[];
  handlePageSelection: () => void;
  handlePageUnselecting: () => void;
  isSelectedAll: boolean;
}) => {
  const [pageSelectionChecked, setPageSelectionChecked] = useState(
    isSelectedAll || conversationOptionsIds.every((id) => deletedConversationsIds.includes(id))
  );

  useEffect(() => {
    setPageSelectionChecked(
      isSelectedAll || conversationOptionsIds.every((id) => deletedConversationsIds.includes(id))
    );
  }, [isSelectedAll, deletedConversationsIds, conversationOptionsIds]);

  return (
    <EuiCheckbox
      data-test-subj={`conversationPageSelect`}
      id={`conversationPageSelect`}
      checked={pageSelectionChecked}
      onChange={(e) => {
        if (e.target.checked) {
          setPageSelectionChecked(true);
          handlePageSelection();
        } else {
          setPageSelectionChecked(false);
          handlePageUnselecting();
        }
      }}
    />
  );
};
