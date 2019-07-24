/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
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
  display: flex;
  height: 100%;
  overflow: hidden;
  width: ${({ width }) => width};
`;

const HeaderFlexItem = styled(EuiFlexItem)<{ width: string }>`
  width: ${({ width }) => width};
`;

const HeaderDiv = styled.div<{ isLoading: boolean }>`
  cursor: ${({ isLoading }) => (isLoading ? 'default' : 'grab')};
  display: flex;
  height: 100%;
  flex-direction: row;
  overflow: hidden;
`;

const TruncatableHeaderText = styled(TruncatableText)`
  font-weight: bold;
  padding: 5px;
`;

interface Props {
  header: ColumnHeader;
  isLoading: boolean;
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
      <HeaderContainer
        data-test-subj="header-container"
        gutterSize="none"
        key={header.id}
        width={`${header.width}px`}
      >
        <Resizeable
          handle={
            <FullHeightFlexItem grow={false}>
              <ColumnHeaderResizeHandle />
            </FullHeightFlexItem>
          }
          height={`${RESIZE_HANDLE_HEIGHT}px`}
          id={header.id}
          render={this.renderActions}
          onResize={this.onResize}
        />
      </HeaderContainer>
    );
  }

  private renderActions = (isResizing: boolean) => {
    const {
      header,
      isLoading,
      onColumnRemoved,
      onFilterChange = noop,
      setIsResizing,
      sort,
    } = this.props;

    setIsResizing(isResizing);

    return (
      <HeaderFlexItem grow={false} width={`${header.width - CELL_RESIZE_HANDLE_WIDTH}px`}>
        <WithHoverActions
          render={showHoverContent => (
            <>
              <HeaderDiv
                data-test-subj="header"
                isLoading={isLoading}
                onClick={!isResizing ? this.onClick : noop}
              >
                <EuiToolTip
                  data-test-subj="header-tooltip"
                  content={<HeaderToolTipContent header={header} />}
                >
                  <FullHeightFlexGroup
                    data-test-subj="header-items"
                    alignItems="center"
                    gutterSize="none"
                  >
                    <EuiFlexItem grow={false}>
                      <FieldNameContainer>
                        <TruncatableHeaderText
                          data-test-subj="header-text"
                          size="xs"
                          width={`${header.width -
                            (ACTIONS_WIDTH + CELL_RESIZE_HANDLE_WIDTH + TITLE_PADDING)}px`}
                        >
                          {header.id}
                        </TruncatableHeaderText>
                      </FieldNameContainer>
                    </EuiFlexItem>
                    <FullHeightFlexItem>
                      <Actions
                        header={header}
                        isLoading={isLoading}
                        onColumnRemoved={onColumnRemoved}
                        show={header.id !== '@timestamp' ? showHoverContent : false}
                        sort={sort}
                      />
                    </FullHeightFlexItem>
                  </FullHeightFlexGroup>
                </EuiToolTip>
              </HeaderDiv>
              <Filter header={header} onFilterChange={onFilterChange} />
            </>
          )}
        />
      </HeaderFlexItem>
    );
  };

  private onClick = () => {
    const { header, isLoading, onColumnSorted, sort } = this.props;

    if (!isLoading && header.aggregatable) {
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
