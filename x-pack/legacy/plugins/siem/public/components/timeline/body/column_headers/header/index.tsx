/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React from 'react';
import { Resizable } from 're-resizable';

// import { OnResize, Resizeable } from '../../../../resize_handle';
import { OnColumnRemoved, OnColumnResized, OnColumnSorted, OnFilterChange } from '../../../events';
import { EventsHeadingHandle } from '../../../styles';
import { Sort } from '../../sort';
import { Actions } from '../actions';
import { ColumnHeader } from '../column_header';
import { Filter } from '../filter';
import { getNewSortDirectionOnClick } from './helpers';
import { HeaderComponent } from './header_component';

interface Props {
  header: ColumnHeader;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  setIsResizing: (isResizing: boolean) => void;
  sort: Sort;
  timelineId: string;
}

/** Renders a header */
export const Header = React.memo<Props>(
  ({
    header,
    onColumnRemoved,
    onColumnResized,
    onColumnSorted,
    onFilterChange = noop,
    setIsResizing,
    sort,
  }) => {
    const onClick = () => {
      onColumnSorted!({
        columnId: header.id,
        sortDirection: getNewSortDirectionOnClick({
          clickedHeader: header,
          currentSort: sort,
        }),
      });
    };

    const onResize: OnResize = ({ delta, id }) => {
      onColumnResized({ columnId: id, delta });
    };

    const renderActions = (isResizing: boolean) => {
      setIsResizing(isResizing);
      return (
        <>
          <HeaderComponent header={header} isResizing={isResizing} onClick={onClick} sort={sort}>
            <Actions header={header} onColumnRemoved={onColumnRemoved} sort={sort} />
          </HeaderComponent>

          <Filter header={header} onFilterChange={onFilterChange} />
        </>
      );
    };

    return (
      <>
        <HeaderComponent header={header} isResizing={false} onClick={onClick} sort={sort}>
          <Actions header={header} onColumnRemoved={onColumnRemoved} sort={sort} />
        </HeaderComponent>

        <Filter header={header} onFilterChange={onFilterChange} />
      </>
    );

    // return (
    //   <div>Test</div>
    //   // <Resizable enable={{ right: true }}>Test</Resizable>
    //   // <Resizeable
    //   //   bottom={0}
    //   //   handle={<EventsHeadingHandle />}
    //   //   id={header.id}
    //   //   onResize={onResize}
    //   //   positionAbsolute
    //   //   render={renderActions}
    //   //   right="-1px"
    //   //   top={0}
    //   // />
    // );
  }
);

Header.displayName = 'Header';
