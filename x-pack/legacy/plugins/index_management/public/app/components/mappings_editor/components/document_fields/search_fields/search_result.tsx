/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import VirtualList from 'react-tiny-virtual-list';

import { SearchResult as SearchResultType } from '../../../types';
import { SearchResultItem } from './search_result_item';

interface Props {
  result: SearchResultType[];
}

const ITEM_HEIGHT = 64;

export const SearchResult = React.memo(({ result }: Props) => {
  const listHeight = Math.min(result.length * ITEM_HEIGHT, 600);

  return (
    <VirtualList
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
              areActionButtonsVisible={true}
              isDimmed={false}
              isHighlighted={false}
            />
          </div>
        );
      }}
    />
  );
});
