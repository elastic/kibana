/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiGlobalToastListToast as Toast,
  EuiPagination,
  EuiPanel,
  EuiPopover,
} from '@elastic/eui';
import { isEmpty, noop, getOr } from 'lodash/fp';
import React, { memo, useState, useEffect } from 'react';
import styled from 'styled-components';

import { Direction } from '../../graphql/types';
import { AuthTableColumns } from '../page/hosts/authentications_table';
import { HeaderPanel } from '../header_panel';
import { LoadingPanel } from '../loading';
import { useStateToaster } from '../toasters';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';

import * as i18n from './translations';

const DEFAULT_DATA_TEST_SUBJ = 'paginated-table';

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

declare type HostsTableColumns = [
  Columns<string>,
  Columns<string>,
  Columns<string>,
  Columns<string>
];

declare type BasicTableColumns = AuthTableColumns | HostsTableColumns;

declare type SiemTables = BasicTableProps<BasicTableColumns>;

// Using telescoping templates to remove 'any' that was polluting downstream column type checks
export interface BasicTableProps<T> {
  columns: T;
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
  loadingTitle?: string;
  loadPage: (activePage: number) => void;
  onChange?: (criteria: Criteria) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageOfItems: any[];
  showMorePagesIndicator: boolean;
  sorting?: SortingBasicTable;
  totalCount: number;
  updateActivePage: (activePage: number) => void;
  updateLimitPagination: (limit: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateProps?: { [key: string]: any };
}

export interface Columns<T> {
  field?: string;
  name: string | React.ReactNode;
  isMobileHeader?: boolean;
  sortable?: boolean;
  truncateText?: boolean;
  hideForMobile?: boolean;
  render?: (item: T) => void;
  width?: string;
}

export const PaginatedTable = memo<SiemTables>(
  ({
    columns,
    dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
    headerCount,
    headerSupplement,
    headerTitle,
    headerTooltip,
    headerUnit,
    id,
    itemsPerRow,
    limit,
    loading,
    loadingTitle,
    loadPage,
    onChange = noop,
    pageOfItems,
    showMorePagesIndicator,
    sorting = null,
    totalCount,
    updateActivePage,
    updateLimitPagination,
    updateProps,
  }) => {
    const [activePage, setActivePage] = useState(0);
    const [showInspect, setShowInspect] = useState(false);
    const [isEmptyTable, setEmptyTable] = useState(pageOfItems.length === 0);
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const pageCount = Math.ceil(totalCount / limit);
    const dispatchToaster = useStateToaster()[1];
    const effectDeps = updateProps ? [limit, ...Object.values(updateProps)] : [limit];
    useEffect(() => {
      if (activePage !== 0) {
        setActivePage(0);
        updateActivePage(0);
      }
    }, effectDeps);

    const onButtonClick = () => {
      setPopoverOpen(!isPopoverOpen);
    };

    const closePopover = () => {
      setPopoverOpen(false);
    };

    const goToPage = (newActivePage: number) => {
      if ((newActivePage + 1) * limit >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
        const toast: Toast = {
          id: 'PaginationWarningMsg',
          title: headerTitle + i18n.TOAST_TITLE,
          color: 'warning',
          iconType: 'alert',
          toastLifeTimeMs: 10000,
          text: i18n.TOAST_TEXT,
        };
        return dispatchToaster({
          type: 'addToaster',
          toast,
        });
      }
      setActivePage(newActivePage);
      loadPage(newActivePage);
      updateActivePage(newActivePage);
    };
    if (!isEmpty(pageOfItems) && isEmptyTable) {
      setEmptyTable(false);
    }
    if (loading && isEmptyTable) {
      return (
        <EuiPanel>
          <LoadingPanel
            height="auto"
            width="100%"
            text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : headerTitle}`}
            data-test-subj="InitialLoadingPanelPaginatedTable"
          />
        </EuiPanel>
      );
    }

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={onButtonClick}
      >
        {`${i18n.ROWS}: ${limit}`}
      </EuiButtonEmpty>
    );

    const rowItems =
      itemsPerRow &&
      itemsPerRow.map((item: ItemsPerRow) => (
        <EuiContextMenuItem
          key={item.text}
          icon={limit === item.numberOfRow ? 'check' : 'empty'}
          onClick={() => {
            closePopover();
            updateLimitPagination(item.numberOfRow);
            updateActivePage(0); // reset results to first page
          }}
        >
          {item.text}
        </EuiContextMenuItem>
      ));
    const PaginationWrapper = showMorePagesIndicator ? PaginationEuiFlexItem : EuiFlexItem;
    return (
      <EuiPanel
        data-test-subj={dataTestSubj}
        onMouseEnter={() => setShowInspect(true)}
        onMouseLeave={() => setShowInspect(false)}
      >
        <BasicTableContainer>
          {loading && (
            <>
              <BackgroundRefetch />
              <LoadingPanel
                height="100%"
                width="100%"
                text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : headerTitle}`}
                position="absolute"
                zIndex={3}
                data-test-subj="LoadingPanelPaginatedTable"
              />
            </>
          )}

          <HeaderPanel
            id={id}
            showInspect={showInspect}
            subtitle={`${i18n.SHOWING}: ${headerCount.toLocaleString()} ${headerUnit}`}
            title={headerTitle}
            tooltip={headerTooltip}
          >
            {headerSupplement}
          </HeaderPanel>

          <BasicTable
            items={pageOfItems}
            columns={columns}
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
          <FooterAction>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                {itemsPerRow && itemsPerRow.length > 0 && totalCount >= itemsPerRow[0].numberOfRow && (
                  <EuiPopover
                    id="customizablePagination"
                    data-test-subj="loadingMoreSizeRowPopover"
                    button={button}
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
                    panelPaddingSize="none"
                  >
                    <EuiContextMenuPanel items={rowItems} data-test-subj="loadingMorePickSizeRow" />
                  </EuiPopover>
                )}
              </EuiFlexItem>
              <PaginationWrapper grow={false}>
                <EuiPagination
                  data-test-subj="numberedPagination"
                  pageCount={pageCount}
                  activePage={activePage}
                  onPageClick={goToPage}
                />
              </PaginationWrapper>
            </EuiFlexGroup>
          </FooterAction>
        </BasicTableContainer>
      </EuiPanel>
    );
  }
);

export const BasicTableContainer = styled.div`
  position: relative;
`;

const FooterAction = styled.div`
  margin-top: 0.5rem;
  width: 100%;
`;

/*
 *   The getOr is just there to simplify the test
 *   So we do NOT need to wrap it around TestProvider
 */
const BackgroundRefetch = styled.div`
  background-color: ${props => getOr('#ffffff', 'theme.eui.euiColorLightShade', props)};
  margin: -5px;
  height: calc(100% + 10px);
  opacity: 0.7;
  width: calc(100% + 10px);
  position: absolute;
  z-index: 3;
  border-radius: 5px;
`;

const BasicTable = styled(EuiBasicTable)`
  tbody {
    th,
    td {
      vertical-align: top;
    }
  }
`;

const PaginationEuiFlexItem = styled(EuiFlexItem)`
  button.euiButtonIcon.euiButtonIcon--text {
    margin-left: 20px;
  }
  .euiPagination {
    position: relative;
  }
  .euiPagination::before {
    content: '\\2026';
    bottom: 5px;
    color: ${props => props.theme.eui.euiButtonColorDisabled};
    font-size: ${props => props.theme.eui.euiFontSizeS};
    position: absolute;
    right: 30px;
  }
`;
