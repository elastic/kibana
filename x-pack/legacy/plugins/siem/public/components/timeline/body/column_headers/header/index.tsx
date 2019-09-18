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
          <EventsHeadingTitleButton onClick={!isResizing && !isLoading ? onClick : noop}>
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
          </EventsHeadingTitleButton>
        ) : (
          <EventsHeadingTitleSpan>
            <TruncatableText data-test-subj={`header-text-${header.id}`}>
              <EuiToolTip
                data-test-subj="header-tooltip"
                content={<HeaderToolTipContent header={header} />}
              >
                <>{header.id}</>
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
        <HeaderComp header={header} isResizing={isResizing} onClick={this.onClick} sort={sort}>
          <Actions header={header} onColumnRemoved={onColumnRemoved} sort={sort} />
        </HeaderComp>

        <Filter header={header} onFilterChange={onFilterChange} />
      </>
    );
  };

  private onClick = () => {
    const { header, onColumnSorted, sort } = this.props;

    onColumnSorted!({
      columnId: header.id,
      sortDirection: getNewSortDirectionOnClick({
        clickedHeader: header,
        currentSort: sort,
      }),
    });
  };

  private onResize: OnResize = ({ delta, id }) => {
    this.props.onColumnResized({ columnId: id, delta });
  };
}
