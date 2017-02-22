import { ItemSelector } from './item_selector';
import { ItemSorter } from './item_sorter';
import { SortOrder } from 'ui_framework/components/table/sort_order';
import { TITLE_COLUMN_ID } from './get_title_column';

export class ItemTableActions {
  static toggleItem(itemTableState, item) {
    if (itemTableState.isItemSelected(item)) {
      ItemSelector.deselectItem(itemTableState, item);
    } else {
      ItemSelector.selectItem(itemTableState, item);
    }
  }

  static toggleAll(itemTableState) {
    if (itemTableState.areAllItemsSelected()) {
      ItemSelector.deselectAll(itemTableState);
    } else {
      ItemSelector.selectAll(itemTableState);
    }
  }

  static replaceItems(itemTableState, newItems) {
    itemTableState.items = newItems;


    ItemSelector.deselectAll(itemTableState);
    itemTableState.items = ItemSorter.sortItems(
      itemTableState.items,
      itemTableState.currentSortedColumn || TITLE_COLUMN_ID,
      itemTableState.currentSortOrder === SortOrder.NONE ? SortOrder.ASC : itemTableState.currentSortOrder);
    this.calculateItemsOnPage(itemTableState);
  }

  static calculateItemsOnPage(itemTableState) {
    itemTableState.pager.setTotalItems(itemTableState.items.length);
    const startItemIndex = itemTableState.pager.startItem - 1;
    const endItemIndex = itemTableState.pager.endItem;
    itemTableState.pageOfItems = itemTableState.items.slice(startItemIndex, endItemIndex);
  }

  static sort(itemTableState, property) {
    if (itemTableState.currentSortedColumn === property) {
      itemTableState.currentSortOrder = ItemSorter.getFlippedSortOrder(itemTableState.currentSortOrder);
    } else {
      itemTableState.currentSortedColumn = property;
      itemTableState.currentSortOrder = SortOrder.ASC;
    }

    itemTableState.items = ItemSorter.sortItems(
      itemTableState.items,
      itemTableState.currentSortedColumn,
      itemTableState.currentSortOrder);
    ItemSelector.deselectAll(itemTableState);
    this.calculateItemsOnPage(itemTableState);
  }

  static turnToNextPage(itemTableState) {
    ItemSelector.deselectAll(itemTableState);
    itemTableState.pager.nextPage();
    this.calculateItemsOnPage(itemTableState);
  }

  static turnToPreviousPage(itemTableState) {
    ItemSelector.deselectAll(itemTableState);
    itemTableState.pager.previousPage();
    this.calculateItemsOnPage(itemTableState);
  }

  static filter(itemTableState, filter, service) {
    return service.find(filter)
      .then(result => {
        this.replaceItems(itemTableState, result.hits);
        itemTableState.filter = filter;
      });
  }

  static deleteSelectedItems(itemTableState, service, notifier, confirmModal, pluralTypeName) {
    const doDelete = () => {
      const selectedIds = itemTableState.selectedItems.map(item => item.id);

      service.delete(selectedIds)
        .then(() => this.filter(itemTableState, itemTableState.filter, service))
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
