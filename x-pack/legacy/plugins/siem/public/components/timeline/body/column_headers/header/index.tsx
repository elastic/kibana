/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { useContext } from 'react';
import styled from 'styled-components';

import { FieldNameContainer } from '../../../../draggables/field_badge';
import { OnResize, Resizeable } from '../../../../resize_handle';
import {
  CELL_RESIZE_HANDLE_WIDTH,
  ColumnHeaderResizeHandle,
} from '../../../../resize_handle/styled_handles';
import { TruncatableText } from '../../../../truncatable_text';
import { WithHoverActions } from '../../../../with_hover_actions';
import { OnColumnRemoved, OnColumnResized, OnColumnSorted, OnFilterChange } from '../../../events';
import { useTimelineContext } from '../../../timeline_context';
import { Sort } from '../../sort';
import { Actions, ACTIONS_WIDTH } from '../actions';
import { ColumnHeader } from '../column_header';
import { FullHeightFlexGroup, FullHeightFlexItem } from '../common/styles';
import { Filter } from '../filter';
import { HeaderToolTipContent } from '../header_tooltip_content';
import { getNewSortDirectionOnClick } from './helpers';

const TITLE_PADDING = 10; // px
const RESIZE_HANDLE_HEIGHT = 35; // px

const HeaderContainer = styled(EuiFlexGroup)<{ width: string }>`
  // display: flex;
  // height: 100%;
  // overflow: hidden;
  // width: ${({ width }) => width};
`;

HeaderContainer.displayName = 'HeaderContainer';

const HeaderFlexItem = styled(EuiFlexItem)<{ width: string }>`
  // width: ${({ width }) => width};
`;

HeaderFlexItem.displayName = 'HeaderFlexItem';

const HeaderDiv = styled.div<{ isLoading: boolean }>`
  align-items: center;
  display: flex;

  // height: 100%;
  // flex-direction: row;
  // overflow: hidden;

  &:hover {
    cursor: ${({ isLoading }) => (isLoading ? 'wait' : 'grab')};
  }
`;

HeaderDiv.displayName = 'HeaderDiv';

interface HeaderCompProps {
  children: React.ReactNode;
  isResizing: boolean;
  onClick: () => void;
}

const HeaderComp = React.memo<HeaderCompProps>(({ children, onClick, isResizing }) => {
  const isLoading = useTimelineContext();
  return (
    <HeaderDiv
      data-test-subj="header"
      onClick={!isResizing && !isLoading ? onClick : noop}
      isLoading={isLoading}
    >
      {children}
    </HeaderDiv>
  );
});

HeaderComp.displayName = 'HeaderComp';

const TruncatableHeaderText = styled(TruncatableText)`
  // font-weight: bold;
  // padding: 5px;
`;

TruncatableHeaderText.displayName = 'TruncatableHeaderText';

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
        handle={<ColumnHeaderResizeHandle />}
        // height={`${RESIZE_HANDLE_HEIGHT}px`}
        id={header.id}
        onResize={this.onResize}
        position="absolute"
        render={this.renderActions}
        right={0}
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
          <TruncatableText data-test-subj={`header-text-${header.id}`}>
            <EuiToolTip
              data-test-subj="header-tooltip"
              content={<HeaderToolTipContent header={header} />}
            >
              <>
                <EuiIcon type="grabHorizontal" /> {header.id}
              </>
            </EuiToolTip>
          </TruncatableText>

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
