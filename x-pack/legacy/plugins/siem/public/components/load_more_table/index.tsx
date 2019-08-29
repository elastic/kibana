/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiPopover,
} from '@elastic/eui';
import { isEmpty, noop } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { Direction } from '../../graphql/types';
import { HeaderPanel } from '../header_panel';
import { Loader } from '../loader';

import * as i18n from './translations';

const DEFAULT_DATA_TEST_SUBJ = 'load-more-table';

export interface ItemsPerRow {
  text: string;
  numberOfRow: number;
}

export interface SortingBasicTable {
  field: string;
  direction: Direction;
  allowNeutralSort?: boolean;
}

export interface Criteria {
  page?: { index: number; size: number };
  sort?: SortingBasicTable;
}

// Using telescoping templates to remove 'any' that was polluting downstream column type checks
interface BasicTableProps<T, U = T, V = T, W = T, X = T, Y = T, Z = T, AA = T, AB = T> {
  columns:
    | [Columns<T>]
    | [Columns<T>, Columns<U>]
    | [Columns<T>, Columns<U>, Columns<V>]
    | [Columns<T>, Columns<U>, Columns<V>, Columns<W>]
    | [Columns<T>, Columns<U>, Columns<V>, Columns<W>, Columns<X>]
    | [Columns<T>, Columns<U>, Columns<V>, Columns<W>, Columns<X>, Columns<Y>]
    | [Columns<T>, Columns<U>, Columns<V>, Columns<W>, Columns<X>, Columns<Y>, Columns<Z>]
    | [
        Columns<T>,
        Columns<U>,
        Columns<V>,
        Columns<W>,
        Columns<X>,
        Columns<Y>,
        Columns<Z>,
        Columns<AA>
      ]
    | [
        Columns<T>,
        Columns<U>,
        Columns<V>,
        Columns<W>,
        Columns<X>,
        Columns<Y>,
        Columns<Z>,
        Columns<AA>,
        Columns<AB>
      ];
  hasNextPage: boolean;
  dataTestSubj?: string;
  headerCount: number;
  headerSupplement?: React.ReactElement;
  headerTitle: string | React.ReactElement;
  headerTooltip?: string;
  headerUnit: string | React.ReactElement;
  id?: string;
  itemsPerRow?: ItemsPerRow[];
  limit: number;
  loading: boolean;
  loadMore: () => void;
  onChange?: (criteria: Criteria) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageOfItems: any[];
  sorting?: SortingBasicTable;
  updateLimitPagination: (limit: number) => void;
}

interface BasicTableState {
  loadingInitial: boolean;
  isPopoverOpen: boolean;
  showInspect: boolean;
}

type Func<T> = (arg: T) => string | number;

export interface Columns<T, U = T> {
  field?: string;
  align?: string;
  name: string | React.ReactNode;
  isMobileHeader?: boolean;
  sortable?: boolean | Func<T>;
  truncateText?: boolean;
  hideForMobile?: boolean;
  render?: (item: T, node: U) => React.ReactNode;
  width?: string;
}

export class LoadMoreTable<T, U, V, W, X, Y, Z, AA, AB> extends React.PureComponent<
  BasicTableProps<T, U, V, W, X, Y, Z, AA, AB>,
  BasicTableState
> {
  public readonly state = {
    loadingInitial: this.props.headerCount === -1,
    isPopoverOpen: false,
    showInspect: false,
  };

  static getDerivedStateFromProps<T, U, V, W, X, Y, Z, AA, AB>(
    props: BasicTableProps<T, U, V, W, X, Y, Z, AA, AB>,
    state: BasicTableState
  ) {
    if (state.loadingInitial && props.headerCount >= 0) {
      return {
        ...state,
        loadingInitial: false,
      };
    }
    return null;
  }

  public render() {
    const {
      columns,
      dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
      hasNextPage,
      headerCount,
      headerSupplement,
      headerTitle,
      headerTooltip,
      headerUnit,
      id,
      itemsPerRow,
      limit,
      loading,
      onChange = noop,
      pageOfItems,
      sorting = null,
      updateLimitPagination,
    } = this.props;
    const { loadingInitial } = this.state;

    const button = (
      <EuiButtonEmpty
        size="xs"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick}
      >
        {`${i18n.ROWS}: ${limit}`}
      </EuiButtonEmpty>
    );

    const rowItems =
      itemsPerRow &&
      itemsPerRow.map(item => (
        <EuiContextMenuItem
          key={item.text}
          icon={limit === item.numberOfRow ? 'check' : 'empty'}
          onClick={() => {
            this.closePopover();
            updateLimitPagination(item.numberOfRow);
          }}
        >
          {item.text}
        </EuiContextMenuItem>
      ));

    return (
      <Panel
        data-test-subj={dataTestSubj}
        loading={{ loading }}
        onMouseEnter={this.mouseEnter}
        onMouseLeave={this.mouseLeave}
      >
        <HeaderPanel
          id={id}
          showInspect={!loadingInitial && this.state.showInspect}
          subtitle={
            !loadingInitial &&
            `${i18n.SHOWING}: ${headerCount >= 0 ? headerCount.toLocaleString() : 0} ${headerUnit}`
          }
          title={headerTitle}
          tooltip={headerTooltip}
        >
          {!loadingInitial && headerSupplement}
        </HeaderPanel>

        {loadingInitial ? (
          <EuiLoadingContent data-test-subj="initialLoadingPanelLoadMoreTable" lines={10} />
        ) : (
          <>
            <BasicTable
              columns={columns}
              compressed
              items={pageOfItems}
              onChange={onChange}
              sorting={
                sorting
                  ? {
                      sort: {
                        field: sorting.field,
                        direction: sorting.direction,
                      },
                    }
                  : null
              }
            />

            {hasNextPage && (
              <FooterAction>
                <EuiFlexItem>
                  {!isEmpty(itemsPerRow) && (
                    <EuiPopover
                      id="customizablePagination"
                      data-test-subj="loadingMoreSizeRowPopover"
                      button={button}
                      isOpen={this.state.isPopoverOpen}
                      closePopover={this.closePopover}
                      panelPaddingSize="none"
                    >
                      <EuiContextMenuPanel
                        items={rowItems}
                        data-test-subj="loadingMorePickSizeRow"
                      />
                    </EuiPopover>
                  )}
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="loadingMoreButton"
                    isLoading={loading}
                    onClick={this.props.loadMore}
                    size="s"
                  >
                    {loading ? `${i18n.LOADING}` : i18n.LOAD_MORE}
                  </EuiButton>
                </EuiFlexItem>
              </FooterAction>
            )}

            {loading && <Loader data-test-subj="loadingPanelLoadMoreTable" overlay size="xl" />}
          </>
        )}
      </Panel>
    );
  }

  private mouseEnter = () => {
    this.setState(prevState => ({
      ...prevState,
      showInspect: true,
    }));
  };

  private mouseLeave = () => {
    this.setState(prevState => ({
      ...prevState,
      showInspect: false,
    }));
  };

  private onButtonClick = () => {
    this.setState(prevState => ({
      ...prevState,
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  private closePopover = () => {
    this.setState(prevState => ({
      ...prevState,
      isPopoverOpen: false,
    }));
  };
}

const Panel = styled(EuiPanel)<{ loading: { loading?: boolean } }>`
  position: relative;

  ${({ loading }) =>
    loading &&
    `
    overflow: hidden;
  `}
`;

Panel.displayName = 'Panel';

const BasicTable = styled(EuiBasicTable)`
  tbody {
    th,
    td {
      vertical-align: top;
    }

    .euiTableCellContent {
      display: block;
    }
  }
`;

BasicTable.displayName = 'BasicTable';

const FooterAction = styled(EuiFlexGroup).attrs({
  alignItems: 'center',
  responsive: false,
})`
  margin-top: ${props => props.theme.eui.euiSizeXS};
`;

FooterAction.displayName = 'FooterAction';
