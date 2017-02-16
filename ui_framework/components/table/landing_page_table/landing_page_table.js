import React from 'react';

import { ItemTable } from './item_table';
import { LandingPageToolBar } from './landing_page_tool_bar';
import { LandingPageToolBarFooter } from './landing_page_tool_bar_footer';
import { PromptForItems } from '../../prompt_for_items/prompt_for_items';

export function LandingPageTable({
    typeName,
    typeNamePlural,
    addHref,
    items,
    columns,
    deleteItems,
    filterItems,
    filter,
    pagerState,
    onNextPage,
    onPreviousPage,
    selectedItemsCount }) {
  return <div>
      <LandingPageToolBar
        filter={filter}
        doFilter={filterItems}
        pagerState={pagerState}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
        doDelete={deleteItems}
        addHref={addHref}
        selectedItemsCount={selectedItemsCount}
      />
    {items.length > 0
      ? <ItemTable items={items} columns={columns}/>
      : <PromptForItems
          singularType={typeName}
          pluralType={typeNamePlural}
          addHref={addHref}/>
    }
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
  deleteItems: React.PropTypes.func.isRequired,
  filterItems: React.PropTypes.func.isRequired,
  filter: React.PropTypes.string,
  pagerState: React.PropTypes.any.isRequired,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired,
  selectedItemsCount: React.PropTypes.number.isRequired,
  /**
   * @param columns {Array.<ColumnDefinition>}
   */
  columns: React.PropTypes.any.isRequired
};
