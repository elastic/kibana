import React from 'react';

import {
  ItemTable,
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarSection,
  PromptForItems,
  KuiToolBarFooter,
  DeleteButton,
  CreateButtonLink,
  KuiToolBarPagerSection,
  KuiSelectedItemsFooterSection,
  columnPropType } from 'ui_framework/components';


export function LandingPageTable({
   // These three things are all constants, I think we could combine them if we had a better structure
   // for constant saved object meta info.  Could also go in ItemTableState but that doesn't feel quite right either.
   // I think I'd prefer a SavedObjectMetaData object to contain this information.
    typeName,
    typeNamePlural,
    addHref,

    onDeleteItems, // TODO: I can move to tableActions, but requires putting more angular stuff in ItemTableActions constructor.
    tableActions,
    columns }) {
  let innerTableContents = null;
  const { pageOfItems, filter, isFetchingItems } = tableActions.getState();
  const selectedItemsCount = tableActions.getState().getSelectedItemsCount();

  if (!isFetchingItems) {
    innerTableContents = pageOfItems.length > 0
      ? <ItemTable items={pageOfItems} columns={columns}/>
      : <PromptForItems
          singularType={typeName}
          pluralType={typeNamePlural}
          addHref={addHref}/>;
  }

  // In order to keep the context of tableActions, it's either this, or tableActions.[function].bind(tableActions).
  // Ideas??  I don't think this violates the rule because it's not an annoynmous arrow function.
  function onFilter(newFilter) {
    tableActions.filter(newFilter);
  }
  function onNextPage() { tableActions.turnToNextPage(); }
  function onPreviousPage() { tableActions.turnToPreviousPage(); }

  return <div>
      <KuiToolBar>
        <KuiToolBarSection>
          <KuiToolBarSearchBox filter={filter} onFilter={onFilter}/>
        </KuiToolBarSection>

        <KuiToolBarSection>
          {
            selectedItemsCount > 0
              ? <DeleteButton onClick={onDeleteItems}/>
              : <CreateButtonLink href={addHref}/>
          }
        </KuiToolBarSection>

        <KuiToolBarPagerSection
          pagerState={tableActions.getState().pager}
          onNextPage={onNextPage}
          onPreviousPage={onPreviousPage}/>
      </KuiToolBar>

      {innerTableContents}

      <KuiToolBarFooter>
        {
          selectedItemsCount > 0
            ? <KuiSelectedItemsFooterSection selectedItemsCount={selectedItemsCount}/>
            : null
        }
        <KuiToolBarPagerSection
          pagerState={tableActions.getState().pager}
          onNextPage={onNextPage}
          onPreviousPage={onPreviousPage}/>
      </KuiToolBarFooter>
    </div>;
}

LandingPageTable.propTypes = {
  typeName: React.PropTypes.string.isRequired,
  typeNamePlural: React.PropTypes.string.isRequired,
  addHref: React.PropTypes.string.isRequired,
  onDeleteItems: React.PropTypes.func.isRequired,
  tableActions: React.PropTypes.any.isRequired,
  columns: React.PropTypes.arrayOf(columnPropType)
};
