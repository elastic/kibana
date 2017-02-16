export class ItemSelector {
  static deselectAll(itemTableState) {
    itemTableState.selectedItems = [];
  }

  static selectAll(itemTableState) {
    itemTableState.selectedItems = itemTableState.pageOfItems.slice(0);
  }

  static toggleAll(itemTableState) {
    if (itemTableState.areAllItemsSelected()) {
      this.deselectAll(itemTableState);
    } else {
      this.selectAll(itemTableState);
    }
  }

  static selectItem(itemTableState, item) {
    itemTableState.selectedItems.push(item);
  }

  static deselectItem(itemTableState, item) {
    if (itemTableState.isItemSelected(item)) {
      const index = itemTableState.selectedItems.indexOf(item);
      itemTableState.selectedItems.splice(index, 1);
    }
  }
}
