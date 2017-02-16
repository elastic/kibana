import { SortOrder } from 'ui_framework/components/table/sort_order';

export class ItemTableState {
  constructor(pagerFactory, editPath, kbnUrl) {
    this.items = [];
    this.pageOfItems = [];
    this.selectedItems = [];
    this.editPath = editPath;
    this.kbnUrl = kbnUrl;

    this.currentSortedColumn = undefined;
    this.currentSortOrder = SortOrder.NONE;

    const itemsPerPage = 20;
    const startingPage = 1;
    this.pager = pagerFactory.create(this.items.length, itemsPerPage, startingPage);
  }

  getSortOrderFor(columnId) {
    return columnId === this.currentSortedColumn ? this.currentSortOrder : SortOrder.NONE;
  }

  areAllItemsSelected() {
    return this.selectedItems.length === this.pageOfItems.length;
  }

  isItemSelected(item) {
    return this.selectedItems.indexOf(item) >= 0;
  }

  getSelectedItemsCount() {
    return this.selectedItems.length;
  }

  getEditUrl(item) {
    return this.kbnUrl.eval(`#${this.editPath}/{{id}}`, { id: item.id });
  }
}
