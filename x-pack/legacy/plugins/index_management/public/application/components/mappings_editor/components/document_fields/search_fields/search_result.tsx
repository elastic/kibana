/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import VirtualList from 'react-tiny-virtual-list';
import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { SearchResult as SearchResultType } from '../../../types';
import { useDispatch } from '../../../mappings_state';
import { State } from '../../../reducer';
import { SearchResultItem } from './search_result_item';

interface Props {
  result: SearchResultType[];
  documentFieldsState: State['documentFields'];
  style?: React.CSSProperties;
}

const ITEM_HEIGHT = 64;

export const SearchResult = React.memo(
  ({ result, documentFieldsState: { status, fieldToEdit }, style: virtualListStyle }: Props) => {
    const dispatch = useDispatch();
    const listHeight = Math.min(result.length * ITEM_HEIGHT, 600);

    const clearSearch = () => {
      dispatch({ type: 'search:update', value: '' });
    };

    return result.length === 0 ? (
      <EuiEmptyPrompt
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
      <VirtualList
        style={{ overflowX: 'hidden', ...virtualListStyle }}
        width="100%"
        height={listHeight}
        itemCount={result.length}
        itemSize={ITEM_HEIGHT}
        overscanCount={4}
        renderItem={({ index, style }) => {
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
        }}
      />
    );
  }
);
