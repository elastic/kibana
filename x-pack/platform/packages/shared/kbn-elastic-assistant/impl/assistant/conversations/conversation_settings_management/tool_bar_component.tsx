/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';
import { ConversationTableItem } from './types';
export interface Props {
  onConversationsBulkDeleted: () => void;
  handleSelectAll: () => void;
  handleUnselectAll: () => void;
  selected: ConversationTableItem[];
  totalConversations: number;
  isDeleteAll: boolean;
}

const ToolbarComponent: React.FC<Props> = ({
  onConversationsBulkDeleted,
  handleSelectAll,
  handleUnselectAll,
  selected,
  totalConversations,
  isDeleteAll,
}) => {
  if (totalConversations === 0) {
    return null;
  }

  const isAnySelected = selected.length > 0 || isDeleteAll;

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="toolbar" gutterSize="none">
      <EuiFlexItem grow={false}>
        {!isDeleteAll && (
          <EuiButtonEmpty
            data-test-subj="selectAllConversations"
            iconType="pagesSelect"
            onClick={handleSelectAll}
            size="xs"
          >
            {i18n.SELECT_ALL_CONVERSATIONS(totalConversations)}
          </EuiButtonEmpty>
        )}
      </EuiFlexItem>

      {isAnySelected && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="unselectAllConversations"
            onClick={handleUnselectAll}
            size="xs"
          >
            {i18n.UNSELECT_ALL_CONVERSATIONS(totalConversations)}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}

      {isAnySelected && (
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="selectedFields" size="xs">
            {i18n.SELECTED_CONVERSATIONS(isDeleteAll ? totalConversations : selected.length)}
          </EuiText>
        </EuiFlexItem>
      )}
      {isAnySelected && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="xs" onClick={onConversationsBulkDeleted}>
            {i18n.DELETE_SELECTED_CONVERSATIONS}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

ToolbarComponent.displayName = 'ToolbarComponent';

export const Toolbar = React.memo(ToolbarComponent);
