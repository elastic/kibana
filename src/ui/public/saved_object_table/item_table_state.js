import { SortOrder } from 'ui_framework/components/table/sort_order';

export class ItemTableState {
  constructor(pagerFactory, editPath) {
    this.isFetchingItems = false;

    this.items = [];
    this.editPath = editPath;

    this.selectedIds = [];

    this.currentSortedColumn = undefined;
    this.currentSortOrder = SortOrder.NONE;

    this.pageOfItems = [];
    const itemsPerPage = 10;
    const startingPage = 1;
    this.pager = pagerFactory.create(this.items.length, itemsPerPage, startingPage);
  }

  getSortOrderFor(columnId) {
    return columnId === this.currentSortedColumn ? this.currentSortOrder : SortOrder.NONE;
  }

  areAllItemsSelected() {
    return this.selectedIds.length === this.pageOfItems.length;
  }

  isItemSelected(item) {
    return this.selectedIds.indexOf(item.id) >= 0;
  }

  getSelectedItemsCount() {
    return this.selectedIds.length;
  }

  getEditUrl(item, kbnUrl) {
    return kbnUrl.eval(`#${this.editPath}/{{id}}`, { id: item.id });
  }
}
