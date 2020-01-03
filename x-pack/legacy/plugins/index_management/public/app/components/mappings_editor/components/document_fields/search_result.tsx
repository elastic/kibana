/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import VirtualList from 'react-tiny-virtual-list';

import { NormalizedField } from '../../types';
import { FieldsListItemFlat } from './fields/fields_list_item_flat';

interface Props {
  fields: NormalizedField[];
}

const ITEM_HEIGHT = 64;

export const SearchResult = React.memo(({ fields }: Props) => {
  const listHeight = Math.min(fields.length * ITEM_HEIGHT, 600);

  return (
    <VirtualList
      width="100%"
      height={listHeight}
      itemCount={fields.length}
      itemSize={ITEM_HEIGHT}
      overscanCount={4}
      renderItem={({ index, style }) => {
        const field = fields[index];

        return (
          <div key={field.id} style={style}>
            <FieldsListItemFlat
              field={field}
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
