/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React, { useCallback } from 'react';

import { ColumnHeaderOptions } from '../../../../../store/timeline/model';
import { OnColumnRemoved, OnColumnSorted, OnFilterChange } from '../../../events';
import { Sort } from '../../sort';
import { Actions } from '../actions';
import { Filter } from '../filter';
import { getNewSortDirectionOnClick } from './helpers';
import { HeaderContent } from './header_content';

interface Props {
  header: ColumnHeaderOptions;
  onColumnRemoved: OnColumnRemoved;
  onColumnSorted: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  sort: Sort;
  timelineId: string;
}

export const HeaderComponent: React.FC<Props> = ({
  header,
  onColumnRemoved,
  onColumnSorted,
  onFilterChange = noop,
  sort,
}) => {
  const onClick = useCallback(() => {
    onColumnSorted!({
      columnId: header.id,
      sortDirection: getNewSortDirectionOnClick({
        clickedHeader: header,
        currentSort: sort,
      }),
    });
  }, [onColumnSorted, header, sort]);

  return (
    <>
      <HeaderContent header={header} isResizing={false} onClick={onClick} sort={sort}>
        <Actions header={header} onColumnRemoved={onColumnRemoved} sort={sort} />
      </HeaderContent>

      <Filter header={header} onFilterChange={onFilterChange} />
    </>
  );
};

export const Header = React.memo(HeaderComponent);
