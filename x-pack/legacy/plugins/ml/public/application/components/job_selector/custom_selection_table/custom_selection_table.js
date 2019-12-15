/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { PropTypes } from 'prop-types';
import {
  EuiCheckbox,
  EuiSearchBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiRadio,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableHeaderCellCheckbox,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
  EuiTableHeaderMobile,
} from '@elastic/eui';

import { Pager } from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';

const JOBS_PER_PAGE = 20;

function getError(error) {
  if (error !== null) {
    return i18n.translate('xpack.ml.jobSelector.filterBar.invalidSearchErrorMessage', {
      defaultMessage: `Invalid search: {errorMessage}`,
      values: { errorMessage: error.message },
    });
  }

  return '';
}

export function CustomSelectionTable({
  columns,
  filterDefaultFields,
  filters,
  items,
  onTableChange,
  selectedIds,
  singleSelection,
  sortableProperties,
  timeseriesOnly,
}) {
  const [itemIdToSelectedMap, setItemIdToSelectedMap] = useState(getCurrentlySelectedItemIdsMap());
  const [currentItems, setCurrentItems] = useState(items);
  const [lastSelected, setLastSelected] = useState(selectedIds);
  const [sortedColumn, setSortedColumn] = useState('');
  const [pager, setPager] = useState();
  const [pagerSettings, setPagerSettings] = useState({
    itemsPerPage: JOBS_PER_PAGE,
    firstItemIndex: 0,
    lastItemIndex: 1,
  });
  const [query, setQuery] = useState(EuiSearchBar.Query.MATCH_ALL);
  const [error, setError] = useState(null); // eslint-disable-line

  useEffect(() => {
    setCurrentItems(items);
    handleQueryChange({ query: query });
  }, [items]); // eslint-disable-line

  // When changes to selected ids made via badge removal - update selection in the table accordingly
  useEffect(() => {
    setItemIdToSelectedMap(getCurrentlySelectedItemIdsMap());
  }, [selectedIds]); // eslint-disable-line

  useEffect(() => {
    const tablePager = new Pager(currentItems.length, JOBS_PER_PAGE);
    setPagerSettings({
      itemsPerPage: JOBS_PER_PAGE,
      firstItemIndex: tablePager.getFirstItemIndex(),
      lastItemIndex: tablePager.getLastItemIndex(),
    });
    setPager(tablePager);
  }, [currentItems]);

  function getCurrentlySelectedItemIdsMap() {
    const selectedIdsMap = { all: false };
    selectedIds.forEach(id => {
      selectedIdsMap[id] = true;
    });
    return selectedIdsMap;
  }

  function handleSingleSelectionTableChange(itemId) {
    onTableChange([itemId]);
  }

  function handleTableChange({ isSelected, itemId }) {
    const selectedMapIds = Object.getOwnPropertyNames(itemIdToSelectedMap);
    const currentItemIds = currentItems.map(item => item.id);

    let currentSelected = selectedMapIds.filter(
      id => itemIdToSelectedMap[id] === true && id !== itemId
    );

    if (itemId !== 'all') {
      if (isSelected === true) {
        currentSelected.push(itemId);
      }
    } else {
      if (isSelected === false) {
        // don't include any current items in the selection update since we're deselecting 'all'
        currentSelected = currentSelected.filter(id => currentItemIds.includes(id) === false);
      } else {
        // grab all id's
        currentSelected = [...currentSelected, ...currentItemIds];
        currentSelected = [...new Set(currentSelected)];
      }
    }

    onTableChange(currentSelected);
  }

  function handleChangeItemsPerPage(itemsPerPage) {
    pager.setItemsPerPage(itemsPerPage);
    setPagerSettings({
      ...pagerSettings,
      itemsPerPage,
      firstItemIndex: pager.getFirstItemIndex(),
      lastItemIndex: pager.getLastItemIndex(),
    });
  }

  function handlePageChange(pageIndex) {
    pager.goToPageIndex(pageIndex);
    setPagerSettings({
      ...pagerSettings,
      firstItemIndex: pager.getFirstItemIndex(),
      lastItemIndex: pager.getLastItemIndex(),
    });
  }

  function handleQueryChange({ query: incomingQuery, error: newError }) {
    if (newError) {
      setError(newError);
    } else {
      const queriedItems = EuiSearchBar.Query.execute(incomingQuery, items, {
        defaultFields: filterDefaultFields,
      });
      setError(null);
      setCurrentItems(queriedItems);
      setQuery(incomingQuery);
    }
  }

  function isItemSelected(itemId) {
    return itemIdToSelectedMap[itemId] === true;
  }

  function areAllItemsSelected() {
    const indexOfUnselectedItem = currentItems.findIndex(item => !isItemSelected(item.id));
    return indexOfUnselectedItem === -1;
  }

  function renderSelectAll(mobile) {
    const selectAll = i18n.translate('xpack.ml.jobSelector.customTable.selectAllCheckboxLabel', {
      defaultMessage: 'Select all',
    });

    return (
      <EuiCheckbox
        id="selectAllCheckbox"
        label={mobile ? selectAll : null}
        checked={areAllItemsSelected()}
        onChange={toggleAll}
        type={mobile ? null : 'inList'}
      />
    );
  }

  function toggleItem(itemId) {
    // If enforcing singleSelection select incoming and deselect the last selected
    if (singleSelection) {
      const lastId = lastSelected[0];
      // deselect last selected and select incoming id
      setItemIdToSelectedMap({ ...itemIdToSelectedMap, [lastId]: false, [itemId]: true });
      handleSingleSelectionTableChange(itemId);
      setLastSelected([itemId]);
    } else {
      const isSelected = !isItemSelected(itemId);
      setItemIdToSelectedMap({ ...itemIdToSelectedMap, [itemId]: isSelected });
      handleTableChange({ isSelected, itemId });
    }
  }

  function toggleAll() {
    const allSelected = areAllItemsSelected() || itemIdToSelectedMap.all === true;
    const newItemIdToSelectedMap = {};
    currentItems.forEach(item => (newItemIdToSelectedMap[item.id] = !allSelected));
    setItemIdToSelectedMap(newItemIdToSelectedMap);
    handleTableChange({ isSelected: !allSelected, itemId: 'all' });
  }

  function onSort(prop) {
    sortableProperties.sortOn(prop);
    const sortedItems = sortableProperties.sortItems(currentItems);
    setCurrentItems(sortedItems);
    setSortedColumn(prop);
  }

  function renderHeaderCells() {
    const headers = [];

    columns.forEach((column, columnIndex) => {
      if (column.isCheckbox && !singleSelection) {
        headers.push(
          <EuiTableHeaderCellCheckbox key={column.id} width={column.width}>
            {renderSelectAll()}
          </EuiTableHeaderCellCheckbox>
        );
      } else {
        headers.push(
          <EuiTableHeaderCell
            key={column.id}
            align={columns[columnIndex].alignment}
            width={column.width}
            onSort={column.isSortable ? () => onSort(column.id) : undefined}
            isSorted={sortedColumn === column.id}
            isSortAscending={
              sortableProperties ? sortableProperties.isAscendingByName(column.id) : true
            }
            mobileOptions={column.mobileOptions}
          >
            {column.label}
          </EuiTableHeaderCell>
        );
      }
    });

    return headers.length ? headers : null;
  }

  function renderRows() {
    const renderRow = item => {
      const cells = columns.map(column => {
        const cell = item[column.id];

        let child;

        if (column.isCheckbox) {
          return (
            <EuiTableRowCellCheckbox key={column.id}>
              {!singleSelection && (
                <EuiCheckbox
                  id={`${item.id}-checkbox`}
                  data-testid={`${item.id}-checkbox`}
                  checked={isItemSelected(item.id)}
                  onChange={() => toggleItem(item.id)}
                  type="inList"
                />
              )}
              {singleSelection && (
                <EuiRadio
                  id={item.id}
                  data-testid={`${item.id}-radio-button`}
                  checked={isItemSelected(item.id)}
                  onChange={() => toggleItem(item.id)}
                  disabled={timeseriesOnly && item.isSingleMetricViewerJob === false}
                />
              )}
            </EuiTableRowCellCheckbox>
          );
        }

        if (column.render) {
          child = column.render(item);
        } else {
          child = cell;
        }

        return (
          <EuiTableRowCell
            key={column.id}
            align={column.alignment}
            truncateText={cell && cell.truncateText}
            textOnly={cell ? cell.textOnly : true}
            mobileOptions={{
              header: column.label,
              ...column.mobileOptions,
            }}
          >
            {child}
          </EuiTableRowCell>
        );
      });

      return (
        <EuiTableRow
          key={item.id}
          isSelected={isItemSelected(item.id)}
          isSelectable={true}
          hasActions={true}
          data-test-subj="mlFlyoutJobSelectorTableRow"
        >
          {cells}
        </EuiTableRow>
      );
    };

    const rows = [];

    for (
      let itemIndex = pagerSettings.firstItemIndex;
      itemIndex <= pagerSettings.lastItemIndex;
      itemIndex++
    ) {
      const item = currentItems[itemIndex];
      if (item === undefined) {
        break;
      }
      rows.push(renderRow(item));
    }

    return rows;
  }

  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false} data-test-subj="mlFlyoutJobSelectorSearchBar">
          <EuiSearchBar
            defaultQuery={query}
            box={{
              incremental: true,
              placeholder: i18n.translate('xpack.ml.jobSelector.customTable.searchBarPlaceholder', {
                defaultMessage: 'Search...',
              }),
            }}
            filters={filters}
            onChange={handleQueryChange}
          />
          <EuiFormRow
            fullWidth
            isInvalid={error !== null}
            error={getError(error)}
            style={{ maxHeight: '0px' }}
          >
            <Fragment />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiTableHeaderMobile>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="baseline">
          <EuiFlexItem grow={false}>{renderSelectAll(true)}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiTableHeaderMobile>
      <EuiTable data-test-subj="mlFlyoutJobSelectorTable">
        <EuiTableHeader>{renderHeaderCells()}</EuiTableHeader>
        <EuiTableBody>{renderRows()}</EuiTableBody>
      </EuiTable>
      <EuiSpacer size="m" />
      {pager !== undefined && (
        <EuiTablePagination
          activePage={pager.getCurrentPageIndex()}
          itemsPerPage={pagerSettings.itemsPerPage}
          itemsPerPageOptions={[10, JOBS_PER_PAGE, 50]}
          pageCount={pager.getTotalPages()}
          onChangeItemsPerPage={handleChangeItemsPerPage}
          onChangePage={pageIndex => handlePageChange(pageIndex)}
        />
      )}
    </Fragment>
  );
}

CustomSelectionTable.propTypes = {
  columns: PropTypes.array.isRequired,
  filterDefaultFields: PropTypes.array,
  filters: PropTypes.array,
  items: PropTypes.array.isRequired,
  onTableChange: PropTypes.func.isRequired,
  selectedId: PropTypes.array,
  singleSelection: PropTypes.bool,
  sortableProperties: PropTypes.object,
  timeseriesOnly: PropTypes.bool,
};
