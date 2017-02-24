export class ItemSelectionActions {
  static deselectAll(selectedIds) {
    selectedIds.selectedIds.splice(0, selectedIds.selectedIds.length);
  }

  static selectAll(selectedIds, items) {
    this.deselectAll(selectedIds);
    items.forEach(item => this.selectItem(selectedIds, item));
  }

  static toggleItem(selectedIds, item) {
    if (selectedIds.isItemSelected(item)) {
      this.deselectItem(selectedIds, item);
    } else {
      this.selectItem(selectedIds, item);
    }
    return selectedIds;
  }

  static toggleAll(selectedIds, items) {
    if (selectedIds.areAllItemsSelected(items)) {
      this.deselectAll(selectedIds);
    } else {
      this.selectAll(selectedIds, items);
    }
    return selectedIds;
  }

  static selectItem(selectedIds, item) {
    if (!selectedIds.isItemSelected(item)) {
      selectedIds.selectedIds.push(item.id);
    }
  }

  static deselectItem(selectedIds, item) {
    if (selectedIds.isItemSelected(item)) {
      const index = selectedIds.indexOf(item);
      selectedIds.selectedIds.splice(index, 1);
    }
  }
}
