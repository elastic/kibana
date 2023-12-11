/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';

import { BulkActions } from '../bulk_actions';
import * as i18n from '../translations';
import { BatchUpdateListItem, ContextEditorRow } from '../types';

export interface Props {
  onListUpdated: (updates: BatchUpdateListItem[]) => void;
  onlyDefaults: boolean;
  onReset?: () => void;
  onSelectAll: () => void;
  selected: ContextEditorRow[];
  totalFields: number;
}

const ToolbarComponent: React.FC<Props> = ({
  onListUpdated,
  onlyDefaults,
  onReset,
  onSelectAll,
  selected,
  totalFields,
}) => (
  <EuiFlexGroup alignItems="center" data-test-subj="toolbar" gutterSize="none">
    <EuiFlexItem grow={false}>
      <EuiText color="subdued" data-test-subj="selectedFields" size="xs">
        {i18n.SELECTED_FIELDS(selected.length)}
      </EuiText>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        data-test-subj="selectAllFields"
        iconType="pagesSelect"
        onClick={onSelectAll}
        size="xs"
      >
        {i18n.SELECT_ALL_FIELDS(totalFields)}
      </EuiButtonEmpty>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <BulkActions
        appliesTo="multipleRows"
        disabled={selected.length === 0}
        onListUpdated={onListUpdated}
        onlyDefaults={onlyDefaults}
        selected={selected}
      />
    </EuiFlexItem>

    {onReset != null && (
      <EuiFlexItem grow={true}>
        <EuiFlexGroup
          alignItems="center"
          data-test-subj="toolbarTrailingActions"
          gutterSize="none"
          justifyContent="flexEnd"
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="resetFields"
              iconType="eraser"
              onClick={onReset}
              size="xs"
            >
              {i18n.RESET}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

ToolbarComponent.displayName = 'ToolbarComponent';

export const Toolbar = React.memo(ToolbarComponent);
