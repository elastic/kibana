/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React from 'react';

import { OnResize, Resizeable } from '../../../../resize_handle';
import { TruncatableText } from '../../../../truncatable_text';
import { OnColumnRemoved, OnColumnResized, OnColumnSorted, OnFilterChange } from '../../../events';
import {
  EventsHeading,
  EventsHeadingHandle,
  EventsHeadingTitleButton,
  EventsHeadingTitleSpan,
} from '../../../styles';
import { useTimelineContext } from '../../../timeline_context';
import { Sort } from '../../sort';
import { SortIndicator } from '../../sort/sort_indicator';
import { Actions } from '../actions';
import { ColumnHeader } from '../column_header';
import { Filter } from '../filter';
import { HeaderToolTipContent } from '../header_tooltip_content';
import { getNewSortDirectionOnClick, getSortDirection } from './helpers';

interface HeaderCompProps {
  children: React.ReactNode;
  header: ColumnHeader;
  isResizing: boolean;
  onClick: () => void;
  sort: Sort;
}

const HeaderComp = React.memo<HeaderCompProps>(
  ({ children, header, isResizing, onClick, sort }) => {
    const isLoading = useTimelineContext();

    return (
      <EventsHeading data-test-subj="header" isLoading={isLoading}>
        {header.aggregatable ? (
          <EventsHeadingTitleButton
            data-test-subj="header-sort-button"
            onClick={!isResizing && !isLoading ? onClick : noop}
          >
            <TruncatableText data-test-subj={`header-text-${header.id}`}>
              <EuiToolTip
                data-test-subj="header-tooltip"
                content={<HeaderToolTipContent header={header} />}
              >
                <>{header.label ?? header.id}</>
              </EuiToolTip>
            </TruncatableText>

            <SortIndicator
              data-test-subj="header-sort-indicator"
              sortDirection={getSortDirection({ header, sort })}
            />
          </EventsHeadingTitleButton>
        ) : (
          <EventsHeadingTitleSpan>
            <TruncatableText data-test-subj={`header-text-${header.id}`}>
              <EuiToolTip
                data-test-subj="header-tooltip"
                content={<HeaderToolTipContent header={header} />}
              >
                <>{header.label ?? header.id}</>
              </EuiToolTip>
            </TruncatableText>
          </EventsHeadingTitleSpan>
        )}

        {children}
      </EventsHeading>
    );
  }
);
HeaderComp.displayName = 'HeaderComp';

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
export const HeaderComponent = ({
  header,
  onColumnRemoved,
  onColumnResized,
  onColumnSorted,
  onFilterChange = noop,
  setIsResizing,
  sort,
}: Props) => {
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
        <HeaderComp header={header} isResizing={isResizing} onClick={onClick} sort={sort}>
          <Actions header={header} onColumnRemoved={onColumnRemoved} sort={sort} />
        </HeaderComp>

        <Filter header={header} onFilterChange={onFilterChange} />
      </>
    );
  };

  return (
    <Resizeable
      bottom={0}
      handle={<EventsHeadingHandle />}
      id={header.id}
      onResize={onResize}
      positionAbsolute
      render={renderActions}
      right="-1px"
      top={0}
    />
  );
};

HeaderComponent.displayName = 'HeaderComponent';

export const Header = React.memo(HeaderComponent);

Header.displayName = 'Header';
