import { ItemSelectionActions } from './item_selection_actions';
import { ItemSorter } from './item_sorter';
import { SortOrder } from 'ui_framework/components/table/sort_order';
import { TITLE_COLUMN_ID } from './get_title_column';

export class ItemTableActions {
  /**
   *
   * @param state {ItemTableState}
   * @param service {SavedObjectLoader} A class that provides the ability to query for items.
   * Should this be in here??  Other option is to pass in to functions but because the service is
   * from angular, it has to be passed along externally then.
   */
  constructor(state, service) {
    // This is awkward, but service has a circular reference and cause max stack size
    // exceeded errors if stored in here and passed around via react.
    this.find = service.find.bind(service);
    this.delete = service.delete.bind(service);

    this.state = state;
    this.selectionActions = new ItemSelectionActions(state);
    this.filter();
  }

  getState() {
    return this.state;
  }

  toggleItem(item) {
    if (this.state.isItemSelected(item)) {
      this.selectionActions.deselectItem(item);
    } else {
      this.selectionActions.selectItem(item);
    }
  }

  toggleAll() {
    if (this.state.areAllItemsSelected()) {
      this.selectionActions.deselectAll();
    } else {
      this.selectionActions.selectAll();
    }
  }

  replaceItems(newItems) {
    this.state.items = newItems;

    this.selectionActions.deselectAll();
    this.state.items = ItemSorter.sortItems(
      this.state.items,
      this.state.currentSortedColumn || TITLE_COLUMN_ID,
      this.state.currentSortOrder === SortOrder.NONE ? SortOrder.ASC : this.state.currentSortOrder);
    this.calculateItemsOnPage();
  }

  calculateItemsOnPage() {
    this.state.pager.setTotalItems(this.state.items.length);
    const startItemIndex = this.state.pager.startItem - 1;
    const endItemIndex = this.state.pager.endItem;
    this.state.pageOfItems = this.state.items.slice(startItemIndex, endItemIndex);
  }

  sort(property) {
    if (this.state.currentSortedColumn === property) {
      this.state.currentSortOrder = ItemSorter.getFlippedSortOrder(this.state.currentSortOrder);
    } else {
      this.state.currentSortedColumn = property;
      this.state.currentSortOrder = SortOrder.ASC;
    }

    this.state.items = ItemSorter.sortItems(
      this.state.items,
      this.state.currentSortedColumn,
      this.state.currentSortOrder);
    this.selectionActions.deselectAll();
    this.calculateItemsOnPage();
  }

  turnToNextPage() {
    this.selectionActions.deselectAll();
    this.state.pager.nextPage();
    this.calculateItemsOnPage();
  }

  turnToPreviousPage() {
    this.selectionActions.deselectAll();
    this.state.pager.previousPage();
    this.calculateItemsOnPage();
  }

  filter(filter) {
    this.state.isFetchingItems = true;
    return this.find(filter)
      .then(result => {
        this.replaceItems(result.hits);
        this.state.filter = filter;
        this.state.isFetchingItems = false;
      });
  }

  deleteSelectedItems(notifier, confirmModal, pluralTypeName) {
    const doDelete = () => {
      const selectedIds = this.state.selectedItems.map(item => item.id);

      this.delete(selectedIds)
        .then(() => this.filter(this.state.filter))
        .catch(error => notifier.error(error));
    };

    confirmModal(
      `Are you sure you want to delete the selected ${pluralTypeName}? This action is irreversible!`,
      {
        confirmButtonText: 'Delete',
        onConfirm: doDelete
      });
  }
}
