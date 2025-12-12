/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { List as VirtualList, type RowComponentProps } from 'react-window';
import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SearchResult as SearchResultType, State } from '../../../types';
import { useDispatch } from '../../../mappings_state_context';
import { SearchResultItem } from './search_result_item';

interface Props {
  result: SearchResultType[];
  documentFieldsState: State['documentFields'];
  style?: React.CSSProperties;
  onClearSearch?: () => void;
}

const ITEM_HEIGHT = 64;

interface RowProps {
  result: Props['result'];
  status: Props['documentFieldsState']['status'];
  fieldToEdit: Props['documentFieldsState']['fieldToEdit'];
}

const RowComponent = ({
  index,
  style,
  result,
  status,
  fieldToEdit,
}: RowComponentProps<RowProps>) => {
  const item = result[index];

  return (
    <div key={item.field.id} style={style}>
      <SearchResultItem
        item={item}
        areActionButtonsVisible={status === 'idle'}
        isDimmed={status === 'editingField' && fieldToEdit !== item.field.id}
        isHighlighted={status === 'editingField' && fieldToEdit === item.field.id}
      />
    </div>
  );
};

export const SearchResult = React.memo(
  ({
    result,
    documentFieldsState: { status, fieldToEdit },
    style: virtualListStyle,
    onClearSearch,
  }: Props) => {
    const dispatch = useDispatch();
    const listHeight = Math.min(result.length * ITEM_HEIGHT, 600);

    const clearSearch = () => {
      if (onClearSearch !== undefined) {
        onClearSearch();
      } else {
        dispatch({ type: 'search:update', value: '' });
      }
    };

    const rowProps = useMemo(
      () => ({ result, status, fieldToEdit }),
      [fieldToEdit, result, status]
    );

    return result.length === 0 ? (
      <EuiEmptyPrompt
        data-test-subj="mappingsEditorSearchResultEmptyPrompt"
        iconType="search"
        title={
          <h3>
            <FormattedMessage
              id="xpack.idxMgmt.mappingsEditor.searchResult.emptyPromptTitle"
              defaultMessage="No fields match your search"
            />
          </h3>
        }
        actions={
          <EuiButton onClick={clearSearch}>
            <FormattedMessage
              id="xpack.idxMgmt.mappingsEditor.searchResult.emptyPrompt.clearSearchButtonLabel"
              defaultMessage="Clear search"
            />
          </EuiButton>
        }
      />
    ) : (
      <div style={{ height: listHeight, width: '100%' }}>
        <VirtualList<RowProps>
          data-test-subj="mappingsEditorSearchResult"
          style={{ height: '100%', width: '100%', overflowX: 'hidden', ...virtualListStyle }}
          rowCount={result.length}
          rowHeight={ITEM_HEIGHT}
          rowProps={rowProps}
          rowComponent={RowComponent}
        />
      </div>
    );
  }
);

SearchResult.displayName = 'SearchResult'; // display name required for tests to work with React.memo
