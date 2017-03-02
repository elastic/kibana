import React from 'react';
import _ from 'lodash';

import { ItemSelectionActions } from 'ui/saved_object_table/item_selection_actions';
import { sortItems, getFlippedSortOrder } from 'ui/saved_object_table/sort_items';
import { Pager, ToolBarPager } from 'ui/pager';
import { ListingTableActions } from 'ui/saved_object_table/listing_table_actions';
import { getCheckBoxColumn } from './get_checkbox_column';

import {
  ItemTable,
  DeleteButton,
  CreateButtonLink,
  SortOrder,
  KuiToolBarSearchBox,
  KuiToolBarPager,
  KuiToolBar,
  KuiToolBarFooter,
  KuiToolBarText,
  KuiTable,
  KuiTh,
  KuiTHead,
  KuiTBody,
  KuiTr,
  ItemTableRow,
} from 'ui_framework/components';


const ITEMS_PER_PAGE = 2;

export class CrudItemTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = ListingTableActions.getInitialState();
    this.pager = new Pager(ITEMS_PER_PAGE);
  }

  componentDidMount() {
    this.onFilter();
  }

  onFilter = (newFilter) => {
    this.setState(ListingTableActions.startFetching());
    this.props.fetch(newFilter).then((results) => {
      const items = results.hits;
      const lastPageIndex = this.pager.getLastPageIndex(items.length);
      this.setState(ListingTableActions.setFilteredItems(this.state, items, lastPageIndex));
    }).finally(() => {
      this.setState(ListingTableActions.endFetching());
    });
  };


  getPageOfItems = () => this.pager.getItemsOnPage(this.state.items, this.state.currentPageIndex);

  onToggleAll = () => this.setState(ListingTableActions.onToggleAll(this.state, this.getPageOfItems()));

  onToggleItem = (item) => this.setState(ListingTableActions.onToggleItem(this.state, item));

  turnToNextPage = () => this.setState(ListingTableActions.turnToNextPage(this.state));

  turnToPreviousPage = () => this.setState(ListingTableActions.turnToPreviousPage(this.state));

  onSort = (property) => this.setState(ListingTableActions.onSort(this.state, property));

  getColumnSortOrder = (column) => ListingTableActions.getSortOrderForColumn(this.state, column);

  getAreAllItemsSelected = () => ListingTableActions.areAllItemsSelected(this.state, this.getPageOfItems());

  onDelete = () => {
    const { deleteItems } = this.props;
    const { selectedIds, filter } = this.state;
    deleteItems(selectedIds).then((didDelete) => {
      if (didDelete) {
        this.onFilter(filter);
      }
    });
  };

  getActionButtons() {
    return this.state.selectedIds.length > 0
      ? <DeleteButton onClick={this.onDelete} />
      : <CreateButtonLink href={this.props.addHref} />;
  }

  getColumns() {
    return [
      getCheckBoxColumn(this.getAreAllItemsSelected(), this.state.selectedIds, this.onToggleItem, this.onToggleAll)]
        .concat(this.props.columns);
  }

  getHeaderRow() {
    const columns = this.getColumns();
    const headerRow = _.map(columns, (column) => {
      if (column.isSortable) {
        return column.getHeaderCell(this.onSort, this.getColumnSortOrder(column.id));
      } else {
        return column.getHeaderCell();
      }
    });
    return headerRow;
  }

  getItemTable() {
    const columns = this.getColumns();
    const rows =  _.map(this.getPageOfItems(),(item) =>
      <ItemTableRow key={item.id} item={item} columns={columns} />
    );

    return <KuiTable>
      <KuiTHead>
        <KuiTr>
          {this.getHeaderRow()}
        </KuiTr>
      </KuiTHead>
      <KuiTBody>
        { rows }
      </KuiTBody>
    </KuiTable>;
  }

  getTableContents() {
    const { isFetchingItems } = this.state;
    if (isFetchingItems) return null;
    const pageOfItems = this.getPageOfItems();

    const tableContents = pageOfItems.length > 0
      ? this.getItemTable()
      : this.props.itemPrompt;
    return tableContents;
  }

  getPagerComponent() {
    return <ToolBarPager
      currentPageIndex={this.state.currentPageIndex}
      totalItems={this.state.items.length}
      itemsPerPage={ITEMS_PER_PAGE}
      onNextPage={this.turnToNextPage}
      onPreviousPage={this.turnToPreviousPage}/>;
  }

  getToolBarSections() {
    const toolBarSections = [
      <KuiToolBarSearchBox filter={this.state.filter} onFilter={this.onFilter}/>,
      this.getActionButtons()
    ];
    if (this.state.items.length > 0) {
      toolBarSections.push(this.getPagerComponent());
    }
    return toolBarSections;
  }

  getToolBarFooterSections() {
    const footerSections = [
      <KuiToolBarText>{this.state.selectedIds.length} selected</KuiToolBarText>,
    ];
    if (this.state.items.length > 0) {
      footerSections.push(this.getPagerComponent());
    }
    return footerSections;
  }

  render() {
    return <div>
      <KuiToolBar sections={this.getToolBarSections()} />
      {
        this.getTableContents()
      }
      <KuiToolBarFooter sections={this.getToolBarFooterSections()} />
    </div>;
  }
}

CrudItemTable.propTypes = {
  fetch: React.PropTypes.func.isRequired,
  deleteItems: React.PropTypes.func.isRequired,
  kbnUrl: React.PropTypes.any.isRequired,
  addHref: React.PropTypes.string,
  itemPrompt: React.PropTypes.node,
  columns: React.PropTypes.any
};
