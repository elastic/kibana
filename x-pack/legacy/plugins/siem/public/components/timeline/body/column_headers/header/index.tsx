/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React from 'react';

import { OnColumnRemoved, OnColumnSorted, OnFilterChange } from '../../../events';
import { Sort } from '../../sort';
import { Actions } from '../actions';
import { ColumnHeader } from '../column_header';
import { Filter } from '../filter';
import { getNewSortDirectionOnClick } from './helpers';
import { HeaderComponent } from './header_component';

interface Props {
  header: ColumnHeader;
  onColumnRemoved: OnColumnRemoved;
  onColumnSorted: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  sort: Sort;
  timelineId: string;
}

export const Header = React.memo<Props>(
  ({ header, onColumnRemoved, onColumnSorted, onFilterChange = noop, sort }) => {
    const onClick = () => {
      onColumnSorted!({
        columnId: header.id,
        sortDirection: getNewSortDirectionOnClick({
          clickedHeader: header,
          currentSort: sort,
        }),
      });
    };

    return (
      <>
        <HeaderComponent header={header} isResizing={false} onClick={onClick} sort={sort}>
          <Actions header={header} onColumnRemoved={onColumnRemoved} sort={sort} />
        </HeaderComponent>

        <Filter header={header} onFilterChange={onFilterChange} />
      </>
    );
  }
);

Header.displayName = 'Header';
