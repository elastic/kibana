export class ItemSelectionActions {
  static deselectAll(selectedIds) {
    selectedIds.selectedIds.splice(0, selectedIds.selectedIds.length);
  }

  static selectAll(selectedIds, items) {
    this.deselectAll(selectedIds);
    items.forEach(item => this.selectItem(selectedIds, item));
  }

  static toggleItem(selectedIds, itemId) {
    const itemIndex = selectedIds.indexOf(itemId);
    if (itemIndex === -1) {
      return selectedIds.concat(itemId);
    }

    const copy = selectedIds.slice(0);
    copy.splice(itemIndex, 1);
    return copy;
  }

  static toggleAll(selectedIds, itemIds) {
    if (this.areAllItemsSelected(selectedIds, itemIds)) {
      return [];
    }

    return itemIds.slice(0);
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

  static areAllItemsSelected(selectedIds, itemIds) {
    return itemIds.every(id => selectedIds.indexOf(id) !== -1);
  }
}
