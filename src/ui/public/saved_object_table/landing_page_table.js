import React from 'react';

import {
  LandingPageToolBar,
  LandingPageToolBarFooter,
  ItemTable,
  columnPropType } from 'ui_framework/components';

function getTableContents(isFetchingItems, pageOfItems, columns, prompt) {
  if (isFetchingItems) return null;
  return pageOfItems.length > 0
    ? <ItemTable items={pageOfItems} columns={columns}/>
    : prompt;
}

export function LandingPageTable({ tableActions, columns, prompt, actionButtons }) {
  const { pageOfItems, pager, filter, isFetchingItems } = tableActions.getState();
  const selectedItemsCount = tableActions.getState().getSelectedItemsCount();

  function onFilter(newFilter) { tableActions.filter(newFilter); }
  function onNextPage() { tableActions.turnToNextPage(); }
  function onPreviousPage() { tableActions.turnToPreviousPage(); }

  return <div>
    <LandingPageToolBar
      filter={filter}
      onFilter={onFilter}
      pagerState={pager}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
      actionButtons={actionButtons}/>
    {
      getTableContents(isFetchingItems, pageOfItems, columns, prompt)
    }
    <LandingPageToolBarFooter
      pagerState={pager}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
      selectedItemsCount={selectedItemsCount}
    />
  </div>;
}

LandingPageTable.propTypes = {
  tableActions: React.PropTypes.any.isRequired,
  columns: React.PropTypes.arrayOf(columnPropType),
  prompt: React.PropTypes.node,
  actionButtons: React.PropTypes.node,
};
