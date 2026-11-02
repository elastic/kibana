/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import type { CaseUI } from '../../common';
import { ADD_TO_CHAT, CHAT_ACTIONS_ARIA_LABEL, SUMMARIZE_CASE } from './translations';
import { useAddCaseToChat } from './use_add_case_to_chat';

interface CaseChatActionsProps {
  caseData: CaseUI;
}

export const CaseChatActions = React.memo<CaseChatActionsProps>(({ caseData }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { addToChat, summarizeCase, isAddToChatAvailable } = useAddCaseToChat(caseData);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        data-test-subj="case-chat-action-add-to-chat"
        icon="productAgent"
        key="add-to-chat"
        onClick={() => {
          closePopover();
          addToChat();
        }}
      >
        {ADD_TO_CHAT}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        data-test-subj="case-chat-action-summarize"
        icon="productAgent"
        key="summarize-case"
        onClick={() => {
          closePopover();
          summarizeCase();
        }}
      >
        {SUMMARIZE_CASE}
      </EuiContextMenuItem>,
    ],
    [addToChat, closePopover, summarizeCase]
  );

  if (!isAddToChatAvailable) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        button={
          <EuiButtonEmpty
            aria-haspopup="menu"
            data-test-subj="case-chat-actions"
            flush="left"
            iconType="productAgent"
            isSelected={isPopoverOpen}
            onClick={togglePopover}
          >
            {ADD_TO_CHAT}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        aria-label={CHAT_ACTIONS_ARIA_LABEL}
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    </EuiFlexItem>
  );
});

CaseChatActions.displayName = 'CaseChatActions';
