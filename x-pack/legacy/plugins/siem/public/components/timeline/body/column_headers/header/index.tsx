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
import { EventsHeading, EventsHeadingHandle, EventsHeadingItem } from '../../../styles';
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
  isResizing: boolean;
  onClick: () => void;
}

const HeaderComp = React.memo<HeaderCompProps>(({ children, onClick, isResizing }) => {
  const isLoading = useTimelineContext();
  return (
    <EventsHeading
      data-test-subj="header"
      onClick={!isResizing && !isLoading ? onClick : noop}
      isLoading={isLoading}
    >
      {children}
    </EventsHeading>
  );
});

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
export class Header extends React.PureComponent<Props> {
  public render() {
    const { header } = this.props;

    return (
      <Resizeable
        bottom={0}
        handle={<EventsHeadingHandle />}
        id={header.id}
        onResize={this.onResize}
        position="absolute"
        render={this.renderActions}
        right="-1px"
        top={0}
      />
    );
  }

  private renderActions = (isResizing: boolean) => {
    const { header, onColumnRemoved, onFilterChange = noop, setIsResizing, sort } = this.props;

    setIsResizing(isResizing);

    return (
      <>
        <HeaderComp isResizing={isResizing} data-test-subj="header" onClick={this.onClick}>
          <EventsHeadingItem className="siemEventsHeading__item--title">
            <TruncatableText data-test-subj={`header-text-${header.id}`}>
              <EuiToolTip
                data-test-subj="header-tooltip"
                content={<HeaderToolTipContent header={header} />}
              >
                <>{header.id}</>
              </EuiToolTip>
            </TruncatableText>

            <SortIndicator
              data-test-subj="header-sort-indicator"
              sortDirection={getSortDirection({ header, sort })}
            />
          </EventsHeadingItem>

          <Actions header={header} onColumnRemoved={onColumnRemoved} sort={sort} />
        </HeaderComp>

        <Filter header={header} onFilterChange={onFilterChange} />
      </>
    );
  };

  private onClick = () => {
    const { header, onColumnSorted, sort } = this.props;

    if (header.aggregatable) {
      onColumnSorted!({
        columnId: header.id,
        sortDirection: getNewSortDirectionOnClick({
          clickedHeader: header,
          currentSort: sort,
        }),
      });
    }
  };

  private onResize: OnResize = ({ delta, id }) => {
    this.props.onColumnResized({ columnId: id, delta });
  };
}
