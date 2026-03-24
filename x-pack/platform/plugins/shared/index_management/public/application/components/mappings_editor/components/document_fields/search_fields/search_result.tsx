/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLiveAnnouncer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FixedSizeList as VirtualList, areEqual } from 'react-window';
import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { SearchResult as SearchResultType, State } from '../../../types';
import { useDispatch } from '../../../mappings_state_context';
import { SearchResultItem } from './search_result_item';
import { useLiveAnnouncement } from '../use_live_announcement';

interface Props {
  result: SearchResultType[];
  documentFieldsState: State['documentFields'];
  style?: React.CSSProperties;
  onClearSearch?: () => void;
}

const ITEM_HEIGHT = 64;

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    result: Props['result'];
    status: Props['documentFieldsState']['status'];
    fieldToEdit: Props['documentFieldsState']['fieldToEdit'];
  };
}

const Row = React.memo<RowProps>(({ data, index, style }) => {
  // Data passed to List as "itemData" is available as props.data
  const { fieldToEdit, result, status } = data;
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
}, areEqual);

export const SearchResult = React.memo(
  ({
    result,
    documentFieldsState: { status, fieldToEdit },
    style: virtualListStyle,
    onClearSearch,
  }: Props) => {
    const dispatch = useDispatch();
    const listHeight = Math.min(result.length * ITEM_HEIGHT, 600);
    const resultsLabel = i18n.translate('xpack.idxMgmt.mappingsEditor.searchResultsLabel', {
      defaultMessage: 'Saved mapping fields search results',
    });

    const resultKey = useMemo(() => result.map((item) => item.field.id).join('|'), [result]);
    const itemsCount = result.length;

    const message = i18n.translate(
      'xpack.idxMgmt.mappingsEditor.searchResultsUpdatedAnnouncementWithCount',
      {
        defaultMessage:
          '{resultsLabel} list has been updated. {itemsCount, plural, one {# item} other {# items}}.',
        values: { resultsLabel, itemsCount },
      }
    );
    const liveAnnouncement = useLiveAnnouncement({
      message,
      changeKey: resultKey,
      announceOnMount: true,
    });

    const clearSearch = () => {
      if (onClearSearch !== undefined) {
        onClearSearch();
      } else {
        dispatch({ type: 'search:update', value: '' });
      }
    };

    const itemData = useMemo(
      () => ({ result, status, fieldToEdit }),
      [fieldToEdit, result, status]
    );

    return (
      <>
        <EuiLiveAnnouncer>{liveAnnouncement}</EuiLiveAnnouncer>
        {result.length === 0 ? (
          <EuiEmptyPrompt
            data-test-subj="mappingsEditorSearchResultEmptyPrompt"
            iconType="magnify"
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
          <div data-test-subj="mappingsEditorSearchResult" aria-label={resultsLabel}>
            <VirtualList
              style={{ overflowX: 'hidden', ...virtualListStyle }}
              width="100%"
              height={listHeight}
              itemData={itemData}
              itemCount={result.length}
              itemSize={ITEM_HEIGHT}
            >
              {Row}
            </VirtualList>
          </div>
        )}
      </>
    );
  }
);

SearchResult.displayName = 'SearchResult'; // display name required for tests to work with React.memo
