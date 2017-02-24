import React from 'react';

import { ItemTable } from './item_table';
import { LandingPageToolBar } from './landing_page_tool_bar';
import { LandingPageToolBarFooter } from './landing_page_tool_bar_footer';
import { PromptForItems } from '../../prompt_for_items/prompt_for_items';
import { columnPropType } from './column_prop_type';

export function LandingPageTable({
    typeName,
    typeNamePlural,
    addHref,
    items,
    columns,
    onDeleteItems,
    onFilterItems,
    filter,
    pagerState,
    onNextPage,
    onPreviousPage,
    selectedItemsCount,
    isFetchingItems }) {
  let innerContents = null;

  if (!isFetchingItems) {
    innerContents = items.length > 0
      ? <ItemTable items={items} columns={columns}/>
      : <PromptForItems
          singularType={typeName}
          pluralType={typeNamePlural}
          addHref={addHref}/>;
  }

  return <div>

    <KuiSectionedToolBar sections={
      [<KuiToolBarSearchBox filter={filter} onFilter={onFilter}/>,
        actionButtons,
        <KuiToolBarPager pagerState={pagerState} onNext={onNextPage} onPrevious={onPreviousPage}/>
      ]
    }/>
      <LandingPageToolBar
        filter={filter}
        onFilter={onFilterItems}
        pagerState={pagerState}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
        onDelete={onDeleteItems}
        addHref={addHref}
        selectedItemsCount={selectedItemsCount}
      />
    {innerContents}
    <LandingPageToolBarFooter
      pagerState={pagerState}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
      selectedItemsCount={selectedItemsCount}
    />
    </div>;
}

LandingPageTable.propTypes = {
  typeName: React.PropTypes.string.isRequired,
  typeNamePlural: React.PropTypes.string.isRequired,
  addHref: React.PropTypes.string.isRequired,
  items: React.PropTypes.array.isRequired,
  onDeleteItems: React.PropTypes.func.isRequired,
  onFilterItems: React.PropTypes.func.isRequired,
  filter: React.PropTypes.string,
  pagerState: React.PropTypes.any.isRequired,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired,
  selectedItemsCount: React.PropTypes.number.isRequired,
  columns: columnPropType,
  isFetchingItems: React.PropTypes.bool.isRequired
};
